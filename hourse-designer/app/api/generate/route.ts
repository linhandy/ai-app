import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { DesignInput, Orientation, GlobalSpec } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';
import { generateFloorPlan, generateFromSketch, generateFromQuickPrompt } from '@/lib/llm';

const VALID_ORIENTATIONS: Orientation[] = ['东', '南', '西', '北', '东南', '东北', '西南', '西北'];
const FLOOR_LABELS = ['一层', '二层', '三层', '四层'];

// ─── Inline job processor (runs after response via after()) ───────────────────
async function processJob(jobId: string, params: Record<string, unknown>, userId: string) {
  const upd = (fields: Record<string, unknown>) =>
    supabaseAdmin.from('design_jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', jobId);

  try {
    await upd({ status: 'processing' });

    if (params.mode === 'sketch') {
      await upd({ progress: 20, progress_msg: 'AI 正在识别草图中的房间布局...' });
      const design = await generateFromSketch(params.imageBase64 as string);
      await upd({ status: 'done', progress: 100, progress_msg: '草图识别完成', design_data: design });

    } else if (params.mode === 'quick') {
      await upd({ progress: 20, progress_msg: 'AI 正在理解设计需求...' });
      const design = await generateFromQuickPrompt(
        params.prompt as string,
        params.landWidth as number,
        params.landHeight as number,
        params.orientation as string
      );
      await upd({ status: 'done', progress: 100, progress_msg: '快捷设计完成', design_data: design });

      void supabaseAdmin.from('house_designs').insert({
        user_id: userId,
        title: `快捷设计 · ${params.landWidth}×${params.landHeight}m`,
        design_data: design,
        land_params: { landWidth: params.landWidth, landHeight: params.landHeight, orientation: params.orientation },
      }).then(({ error: e }) => { if (e) console.warn('[generate] auto-save failed:', e.message); });

    } else {
      const input: DesignInput = {
        landWidth:         params.landWidth as number,
        landHeight:        params.landHeight as number,
        orientation:       params.orientation as Orientation,
        numFloors:         params.numFloors as number,
        floorRequirements: params.floorRequirements as string[],
      };
      const globalSpec = (params.globalSpec ?? {}) as Partial<GlobalSpec>;

      await upd({ progress: 5, progress_msg: 'AI 开始分析地块参数...' });

      const design = await generateFloorPlan(input, globalSpec, async (floorNum, total) => {
        const pct = Math.round(5 + ((floorNum - 1) / total) * 85);
        await upd({
          current_floor: floorNum,
          progress: pct,
          progress_msg: `正在生成${FLOOR_LABELS[floorNum - 1]}...（${floorNum}/${total}）`,
        });
      });

      await upd({ status: 'done', progress: 100, progress_msg: '户型设计生成完成', design_data: design });

      // Fire-and-forget: auto-save to house_designs
      void supabaseAdmin.from('house_designs').insert({
        user_id: userId,
        title: `${input.landWidth}×${input.landHeight}m · ${input.numFloors}层 · 朝${input.orientation}`,
        design_data: design,
        land_params: { landWidth: input.landWidth, landHeight: input.landHeight, orientation: input.orientation, floors: input.numFloors },
      }).then(({ error: e }) => { if (e) console.warn('[generate] auto-save failed:', e.message); });
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[generate] job ${jobId} failed:`, msg);
    await supabaseAdmin.from('design_jobs')
      .update({ status: 'failed', error_msg: msg, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }
}

// ─── POST /api/generate ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await req.json();

  // ── Sketch mode ──────────────────────────────────────────────────────────────
  if (body.mode === 'sketch') {
    const { imageBase64 } = body;
    if (!imageBase64) return NextResponse.json({ error: '请上传草图' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('design_jobs')
      .insert({
        user_id: userId,
        input_params: { mode: 'sketch', imageBase64 },
        status: 'pending',
        total_floors: 1,
        progress: 0,
        progress_msg: 'AI 正在识别草图...',
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const jobId = data.id;
    after(() => processJob(jobId, { mode: 'sketch', imageBase64 }, userId));
    return NextResponse.json({ jobId });
  }

  // ── Quick mode ───────────────────────────────────────────────────────────────
  if (body.mode === 'quick') {
    const { prompt, landWidth, landHeight, orientation } = body;
    if (!prompt) return NextResponse.json({ error: '请输入设计需求' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('design_jobs')
      .insert({
        user_id: userId,
        input_params: { mode: 'quick', prompt, landWidth, landHeight, orientation },
        status: 'pending',
        total_floors: 1,
        progress: 0,
        progress_msg: 'AI 正在理解设计需求...',
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const jobId = data.id;
    after(() => processJob(jobId, { mode: 'quick', prompt, landWidth, landHeight, orientation }, userId));
    return NextResponse.json({ jobId });
  }

  // ── Param mode ───────────────────────────────────────────────────────────────
  const input: DesignInput = body;

  if (!input.landWidth || !input.landHeight || input.landWidth < 5 || input.landWidth > 50) {
    return NextResponse.json({ error: '地块宽度须为 5-50 米' }, { status: 400 });
  }
  if (input.landHeight < 5 || input.landHeight > 50) {
    return NextResponse.json({ error: '地块深度须为 5-50 米' }, { status: 400 });
  }
  if (!VALID_ORIENTATIONS.includes(input.orientation)) {
    return NextResponse.json({ error: '朝向不合法' }, { status: 400 });
  }
  if (input.numFloors < 1 || input.numFloors > 4) {
    return NextResponse.json({ error: '楼层数须为 1-4 层' }, { status: 400 });
  }
  if (!input.floorRequirements || input.floorRequirements.length < input.numFloors) {
    return NextResponse.json({ error: '请为每层填写布局需求' }, { status: 400 });
  }

  const globalSpec: Partial<GlobalSpec> = body.globalSpec ?? {};
  const title = `${input.landWidth}×${input.landHeight}m · ${input.numFloors}层 · 朝${input.orientation}`;

  const { data, error } = await supabaseAdmin
    .from('design_jobs')
    .insert({
      user_id: userId,
      title,
      input_params: { mode: 'param', ...input, globalSpec },
      status: 'pending',
      total_floors: input.numFloors,
      current_floor: 0,
      progress: 0,
      progress_msg: '等待 AI 开始生成...',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const jobId = data.id;
  const jobParams = { mode: 'param', ...input, globalSpec };
  after(() => processJob(jobId, jobParams, userId));
  return NextResponse.json({ jobId });
}
