import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { HouseDesign } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';
import { optimizeDesign } from '@/lib/llm';

interface WeakDim {
  key: string;
  label: string;
  score: number;
  comment: string;
}

async function processOptimize(
  jobId: string,
  design: HouseDesign,
  weakDimensions: WeakDim[],
) {
  const upd = (fields: Record<string, unknown>) =>
    supabaseAdmin.from('design_jobs').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', jobId);

  try {
    await upd({ status: 'processing', progress: 30, progress_msg: 'AI 正在优化低分项...' });
    const optimized = await optimizeDesign(design, weakDimensions);
    await upd({ status: 'done', progress: 100, progress_msg: '优化完成', design_data: optimized });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[optimize] job ${jobId} failed:`, msg);
    await supabaseAdmin.from('design_jobs')
      .update({ status: 'failed', error_msg: msg, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { design, weakDimensions }: { design: HouseDesign; weakDimensions: WeakDim[] } = await req.json();

  if (!design || !weakDimensions?.length) {
    return NextResponse.json({ error: '缺少设计数据或评分反馈' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('design_jobs')
    .insert({
      user_id: userId,
      input_params: { mode: 'optimize', weakDimensions },
      status: 'pending',
      total_floors: design.floors?.length ?? 1,
      progress: 0,
      progress_msg: '准备优化中...',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const jobId = data.id;
  after(() => processOptimize(jobId, design, weakDimensions));
  return NextResponse.json({ jobId });
}
