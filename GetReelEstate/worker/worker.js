/**
 * GetReelEstate — VPS Worker
 * 部署在 VPS 上，用 pm2 运行。
 * 监听 Supabase videos 表的 INSERT/UPDATE 事件，
 * 处理 paid=true 的 pending 任务。
 *
 * 安装: npm install @supabase/supabase-js dotenv
 * 运行: pm2 start worker.js --name getreel-worker
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { runPipeline } from './pipeline.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── Resend (email) ───────────────────────────────────────────────────────────

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendCompletionEmail(toEmail, videoUrl, script) {
  if (!resend || !toEmail) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'GetReelEstate <noreply@getreelestate.com>',
      to: toEmail,
      subject: 'Your Real Estate Reel is Ready! 🎬',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#f59e0b;border-radius:8px;padding:8px 16px;font-weight:700;color:#1c1917;font-size:18px">
              GetReelEstate
            </div>
          </div>
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Your reel is ready! 🎉</h1>
          <p style="color:#94a3b8;margin-bottom:24px">Your AI-generated real estate video is ready to download and post.</p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${videoUrl}" style="display:inline-block;background:#f59e0b;color:#1c1917;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px">
              ⬇️ Download Your Video
            </a>
          </div>
          ${script ? `
          <div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:24px">
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">AI Script</div>
            <p style="color:#e2e8f0;line-height:1.6;margin:0">${script}</p>
          </div>` : ''}
          <p style="color:#475569;font-size:12px;text-align:center;margin:0">
            Ready for Instagram Reels, TikTok, YouTube Shorts &amp; Facebook
          </p>
        </div>
      `,
    });
    console.log(`[worker] ✉ email sent to ${toEmail}`);
  } catch (e) {
    console.error('[worker] email failed:', e.message);
  }
}

// ─── In-process dedup lock ────────────────────────────────────────────────────
// Prevents Realtime + poll from both starting the same task concurrently.
const inFlight = new Set();

// ─── Process one video task ───────────────────────────────────────────────────

async function processTask(videoId) {
  if (inFlight.has(videoId)) {
    console.log(`[worker] skipping ${videoId} — already in-flight`);
    return;
  }
  inFlight.add(videoId);
  console.log(`[worker] picking up task ${videoId}`);

  // 1. Mark as processing (prevent double-pick)
  const { error: lockErr } = await supabase
    .from('videos')
    .update({ status: 'processing' })
    .eq('id', videoId)
    .eq('status', 'pending'); // optimistic lock

  if (lockErr) {
    console.error(`[worker] lock failed ${videoId}:`, lockErr.message);
    return;
  }

  // 2. Fetch full record (also confirms the lock succeeded — status must be 'processing')
  const { data: task, error: fetchErr } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .eq('status', 'processing')  // If another worker grabbed it first, this returns nothing
    .single();

  if (fetchErr || !task) {
    console.log(`[worker] skipping ${videoId} — already taken or not found`);
    return;
  }

  // Use a unique timestamp-based suffix to avoid collisions across retries
  const workDir = path.join(os.tmpdir(), `getreel-${videoId}-${Date.now()}`);

  try {
    // 3. Download source images from Supabase Storage URLs
    const imageUrls = task.source_urls || [];
    const imagePaths = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const imgPath = path.join(workDir, `img_${i}.${ext}`);
      fs.mkdirSync(workDir, { recursive: true });

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download image: ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(imgPath, buf);
      imagePaths.push(imgPath);
    }

    if (!imagePaths.length) throw new Error('No images to render');

    // 4. Run the video pipeline (LLM + TTS + FFmpeg)
    const { videoPath, script } = await runPipeline({
      propertyDescription: task.prompt,
      imagePaths,
      workDir,
    });

    // 5. Upload rendered video to Supabase Storage
    const videoBuffer = fs.readFileSync(videoPath);
    const storagePath = `videos/${videoId}/output.mp4`;

    const { error: uploadErr } = await supabase.storage
      .from('reels')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadErr) throw new Error('Storage upload failed: ' + uploadErr.message);

    const { data: { publicUrl } } = supabase.storage
      .from('reels')
      .getPublicUrl(storagePath);

    // 6. Mark as completed
    await supabase
      .from('videos')
      .update({ status: 'completed', video_url: publicUrl, script })
      .eq('id', videoId);

    console.log(`[worker] ✓ completed ${videoId} → ${publicUrl}`);

    // 7. Send email notification (non-blocking)
    await sendCompletionEmail(task.user_email, publicUrl, script);

  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`[worker] ✗ failed ${videoId}:`, msg);
    if (err?.stack) console.error(err.stack);
    await supabase
      .from('videos')
      .update({ status: 'failed', error_msg: msg })
      .eq('id', videoId);
  } finally {
    inFlight.delete(videoId);
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// ─── Poll for pending paid tasks ──────────────────────────────────────────────
// Realtime 用于实时响应，轮询作为兜底

async function pollPendingTasks() {
  const { data: tasks, error } = await supabase
    .from('videos')
    .select('id')
    .eq('status', 'pending')
    .eq('paid', true)
    .order('created_at', { ascending: true })
    .limit(3);

  if (error) { console.error('[worker] poll error:', error.message); return; }
  console.log(`[worker] poll: found ${tasks?.length ?? 0} pending tasks`);

  for (const task of tasks || []) {
    processTask(task.id).catch(console.error);
  }
}

// ─── Realtime listener ────────────────────────────────────────────────────────

supabase
  .channel('videos-inserts')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'videos' },
    (payload) => {
      const row = payload.new;
      if (row.status === 'pending' && row.paid === true) {
        processTask(row.id).catch(console.error);
      }
    },
  )
  .subscribe((status) => {
    console.log('[worker] Realtime status:', status);
  });

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log('[worker] started — listening for paid pending tasks…');
pollPendingTasks(); // 启动时处理已有的 pending 任务
setInterval(pollPendingTasks, 30_000); // 每 30s 轮询一次
