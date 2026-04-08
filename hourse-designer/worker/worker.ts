/**
 * 易建房 — 后台 Worker
 * 部署在 VPS 上，用 pm2 + tsx 运行。
 * 轮询 Supabase design_jobs 表，调用 LLM 逐层生成户型方案。
 *
 * ─── 所需 Supabase 表 (在 Supabase 控制台执行) ──────────────────────────────
 *
 * CREATE TABLE design_jobs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   title TEXT,
 *   input_params JSONB NOT NULL,
 *   status TEXT NOT NULL DEFAULT 'pending',
 *   current_floor INT DEFAULT 0,
 *   total_floors INT DEFAULT 1,
 *   progress INT DEFAULT 0,
 *   progress_msg TEXT,
 *   design_data JSONB,
 *   error_msg TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX ON design_jobs (status, created_at);
 *
 * ─── 启动 ────────────────────────────────────────────────────────────────────
 *   cd /path/to/hourse-designer
 *   pm2 start worker/ecosystem.config.cjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateFloorPlan, generateFromSketch } from '../lib/llm';
import type { DesignInput, GlobalSpec } from '../lib/types';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// ─── In-process dedup ─────────────────────────────────────────────────────────

const inFlight = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLOOR_LABELS = ['一层', '二层', '三层', '四层'];

async function upd(jobId: string, fields: Record<string, unknown>) {
  await supabase
    .from('design_jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

// ─── Process one job ──────────────────────────────────────────────────────────

async function processJob(jobId: string) {
  if (inFlight.has(jobId)) return;
  inFlight.add(jobId);
  console.log(`[worker] ▶ job ${jobId}`);

  // Optimistic lock: pending → processing
  const { error: lockErr } = await supabase
    .from('design_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'pending');

  if (lockErr) {
    console.error(`[worker] lock failed ${jobId}:`, lockErr.message);
    inFlight.delete(jobId);
    return;
  }

  const { data: job, error: fetchErr } = await supabase
    .from('design_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'processing')
    .single();

  if (fetchErr || !job) {
    console.log(`[worker] job ${jobId} already taken`);
    inFlight.delete(jobId);
    return;
  }

  try {
    const params = job.input_params as Record<string, unknown>;

    if (params.mode === 'sketch') {
      // ── Sketch: single LLM call, auto-detect dims + orientation ────────────
      await upd(jobId, { progress: 15, progress_msg: 'AI 正在识别草图中的房间布局...' });
      const imageBase64 = params.imageBase64 as string;
      const design = await generateFromSketch(imageBase64);
      await upd(jobId, { status: 'done', progress: 100, progress_msg: '草图识别完成', design_data: design });
      console.log(`[worker] ✓ sketch job ${jobId}`);

    } else {
      // ── Param mode: floor-by-floor with progress ────────────────────────────
      const input: DesignInput = {
        landWidth:          params.landWidth as number,
        landHeight:         params.landHeight as number,
        orientation:        params.orientation as DesignInput['orientation'],
        numFloors:          params.numFloors as number,
        floorRequirements:  params.floorRequirements as string[],
      };
      const globalSpec = (params.globalSpec ?? {}) as Partial<GlobalSpec>;
      const total = input.numFloors;

      await upd(jobId, { progress: 5, progress_msg: 'AI 开始分析地块参数...' });

      const design = await generateFloorPlan(input, globalSpec, async (floorNum, total) => {
        const pct = Math.round(5 + ((floorNum - 1) / total) * 85);
        await upd(jobId, {
          current_floor: floorNum,
          progress: pct,
          progress_msg: `正在生成${FLOOR_LABELS[floorNum - 1]}...（${floorNum}/${total}）`,
        });
      });

      await upd(jobId, { status: 'done', progress: 100, progress_msg: '户型设计生成完成', design_data: design });

      // Fire-and-forget: auto-save to house_designs
      void supabase.from('house_designs').insert({
        user_id: job.user_id,
        title: job.title ?? `${input.landWidth}×${input.landHeight}m · ${total}层`,
        design_data: design,
        land_params: {
          landWidth: input.landWidth, landHeight: input.landHeight,
          orientation: input.orientation, floors: total,
        },
      }).then(({ error: e }) => { if (e) console.warn('[worker] auto-save failed:', e.message); });

      console.log(`[worker] ✓ param job ${jobId} (${total} floors)`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] ✗ job ${jobId}:`, msg);
    await upd(jobId, { status: 'failed', error_msg: msg });
  } finally {
    inFlight.delete(jobId);
  }
}

// ─── Poll for pending jobs ────────────────────────────────────────────────────

async function pollPendingJobs() {
  const { data: jobs, error } = await supabase
    .from('design_jobs')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(3);

  if (error) { console.error('[worker] poll error:', error.message); return; }
  if (jobs?.length) console.log(`[worker] poll: ${jobs.length} pending job(s)`);
  for (const j of jobs ?? []) processJob(j.id).catch(console.error);
}

// ─── Realtime listener ────────────────────────────────────────────────────────

supabase
  .channel('design-jobs-channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'design_jobs' }, (payload) => {
    const row = payload.new as { id: string; status: string };
    if (row.status === 'pending') processJob(row.id).catch(console.error);
  })
  .subscribe((s) => console.log('[worker] Realtime status:', s));

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log('[worker] 易建房 worker started — listening for jobs…');
pollPendingJobs();
setInterval(pollPendingJobs, 15_000);
