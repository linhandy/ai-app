/**
 * GetReelEstate - Phase 1: CLI Video Generation Pipeline
 *
 * Flow:
 *   1. Load property images from ./test-images/
 *   2. LLM (Gemini 3 Pro via Zenmux) → generate 60-80 word marketing voiceover script
 *   3. TTS (Microsoft Edge TTS — free, no API key, works in China) → voiceover.mp3 + word timestamps
 *   5. FFmpeg → compose 9:16 video with Ken Burns + captions
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { MsEdgeTTS, OUTPUT_FORMAT, MetadataOptions } from 'msedge-tts';
import fs, { mkdirSync } from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get exact audio duration via ffprobe */
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err || !meta?.format?.duration) {
        // Fallback: estimate from file size
        const size = fs.statSync(filePath).size;
        resolve(size / 12000);
      } else {
        resolve(meta.format.duration);
      }
    });
  });
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  zenmuxApiKey: process.env.ZENMUX_API_KEY,
  zenmuxBaseURL: process.env.ZENMUX_BASE_URL || 'https://zenmux.ai/api/v1',
  llmModel: 'google/gemini-3-pro-preview',
  // Edge TTS voice — en-US-GuyNeural is deep and energetic, great for real estate
  ttsVoice: 'en-US-GuyNeural',
  outputDir: './output',
  imagesDir: './test-images',
  // 16:9 landscape — matches reference video vid-1016-Santaluz.mp4 (1280x720)
  videoWidth: 1280,
  videoHeight: 720,
  fps: 30,
  secondsPerImage: 5,
};

// Hard-coded test property description (Phase 1: no UI needed)
const TEST_PROPERTY = `
  Stunning 4-bedroom, 3-bathroom home in Austin, TX.
  Listed at $875,000. 2,800 sq ft. Newly renovated open kitchen with
  quartz countertops, a resort-style backyard pool, 3-car garage, and
  a master suite with spa bath. Walking distance to top-rated schools.
  Move-in ready. Priced to sell fast.
`;

// ─── API Clients ─────────────────────────────────────────────────────────────

// LLM: Zenmux gateway
const zenmuxClient = new OpenAI({
  apiKey: CONFIG.zenmuxApiKey,
  baseURL: CONFIG.zenmuxBaseURL,
});

// ─── Step 1: Generate Voiceover Script ───────────────────────────────────────

async function generateScript(propertyDescription) {
  console.log('\n📝 [Step 1] Generating voiceover script...');

  const completion = await zenmuxClient.chat.completions.create({
    model: CONFIG.llmModel,
    messages: [
      {
        role: 'system',
        content: `You are an elite real estate marketing copywriter.
Write punchy, high-energy voiceover scripts for social media reels.
Style: Direct, exciting, like a top-performing realtor talking to camera.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use strong selling language (dream home, once-in-a-lifetime, act fast, etc.)
- End with a clear call to action (e.g. "DM me NOW", "Link in bio to book a tour")`,
      },
      {
        role: 'user',
        content: `Write a 60-80 word voiceover script for this property:\n\n${propertyDescription}`,
      },
    ],
  });

  const script = completion.choices[0].message.content.trim();
  const wordCount = script.split(/\s+/).length;
  console.log(`   ✓ Script generated (${wordCount} words)`);
  console.log(`   "${script.slice(0, 80)}..."`);
  return script;
}

// ─── Step 2: Text-to-Speech + Word Timestamps (Edge TTS) ─────────────────────

/**
 * Uses Microsoft Edge TTS (free, no API key, works in China).
 * Returns { audioPath, words, duration }.
 * words: [{ word, start, end }, ...]
 */
async function generateVoiceover(script, outputPath) {
  console.log('\n🎙️  [Step 2] Generating voiceover (Edge TTS + WordBoundary)...');
  console.log(`   Voice: ${CONFIG.ttsVoice}`);

  // Enable word boundary metadata for accurate subtitle sync
  // Use MetadataOptions with wordBoundaryEnabled for accurate caption sync
  const metaOpts = new MetadataOptions();
  metaOpts.wordBoundaryEnabled = true;

  // Use toFile (plain text, not SSML) with ProsodyOptions for rate control
  const workDir = path.dirname(outputPath);
  const tmpDir  = path.join(workDir, '_tts_tmp');
  mkdirSync(tmpDir, { recursive: true });

  const { ProsodyOptions } = await import('msedge-tts').then(m => m);
  const prosody = new ProsodyOptions();
  prosody.rate = '-20%';

  // Retry up to 5 times — create a FRESH MsEdgeTTS instance each attempt so a
  // broken WebSocket from a prior attempt doesn't poison the retry.
  let ttsResult;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(CONFIG.ttsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, metaOpts);
      ttsResult = await tts.toFile(tmpDir, script, { ...metaOpts, ...prosody });
      break;
    } catch (e) {
      if (attempt === 5) throw e;
      const delay = 3000 * attempt;
      console.log(`   ⚠ TTS attempt ${attempt} failed (${e.message ?? e}), retrying in ${delay / 1000}s…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  const { audioFilePath, metadataFilePath } = ttsResult;

  // Verify audio file exists before copying — TTS can return without throwing
  // even when the file wasn't fully written (flaky WebSocket edge case).
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`TTS audio file missing after generation: ${audioFilePath}`);
  }

  // Copy to final output path (avoid renameSync — Windows keeps handles open).
  fs.copyFileSync(audioFilePath, outputPath);
  try { fs.unlinkSync(audioFilePath); } catch { /* ignore — tmpDir cleaned later */ }

  // Parse word boundary events → { word, start, end } in seconds
  let words = [];
  if (metadataFilePath) {
    const raw = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
    words = (raw.Metadata || [])
      .filter(e => e.Type === 'WordBoundary')
      .map(e => ({
        word:  e.Data.text.Text,
        start: parseFloat((e.Data.Offset  / 10_000_000).toFixed(3)),
        end:   parseFloat(((e.Data.Offset + e.Data.Duration) / 10_000_000).toFixed(3)),
      }));
    // Note: do NOT delete tmpDir here — the TTS stream close handler may still
    // try to unlink metadata.json after this function returns, causing a crash.
    // The parent workDir (which contains tmpDir) is cleaned up by the caller.
  }

  const duration = await getAudioDuration(outputPath);
  const stats    = fs.statSync(outputPath);
  console.log(`   ✓ Audio saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB, ${duration.toFixed(1)}s)`);
  console.log(`   ✓ ${words.length} real WordBoundary timestamps`);

  return { audioPath: outputPath, words, duration };
}

// ─── Step 4: Write ASS Subtitle File (line-by-line captions) ─────────────────

/**
 * Groups words into lines of ~5 words, each line shown for its full duration.
 * Bottom-center, white text on semi-transparent black box — readable on any bg.
 */
function writeAssSubtitles(words, assPath, videoWidth, videoHeight) {
  const WORDS_PER_LINE = 7;                          // More words per line for 16:9 width
  const fontSize = Math.floor(videoHeight * 0.068); // ~49px on 720h — scales with height
  const marginV  = Math.floor(videoHeight * 0.06);  // 6% from bottom

  const toAssTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = (s % 60).toFixed(2).padStart(5, '0');
    return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  };

  // Group words into lines
  const lines = [];
  for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
    const chunk = words.slice(i, i + WORDS_PER_LINE);
    lines.push({
      text: chunk.map(w => w.word.replace(/[{}\\]/g, '')).join(' '),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
    });
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Line,Arial,${fontSize},&H00FFFFFF,&H00000000,&HB0000000,-1,0,0,3,0,0,2,30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = lines.map(({ text, start, end }) =>
    `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Line,,0,0,0,,{\\an2}${text}`
  ).join('\n');

  fs.writeFileSync(assPath, header + events);
}

// ─── Step 5: Render Video with FFmpeg ────────────────────────────────────────

// ── Pass 1: render single image → temp MP4 clip with Ken Burns ────────────────
function renderClip(imgPath, clipPath, duration, idx, videoWidth, videoHeight, fps) {
  const frames = Math.floor(duration * fps);
  const zoomIn = idx % 2 === 0;
  // Smooth zoom using 'on' (frame counter within this clip)
  const step = (0.28 / Math.max(frames, 1)).toFixed(7);
  const zoomExpr = zoomIn
    ? `zoom='min(1.0+on*${step},1.28)'`
    : `zoom='max(1.28-on*${step},1.0)'`;
  // Gentle pan: drift slightly left/right
  const panX = zoomIn
    ? `x='(iw-iw/zoom)/2+sin(on*0.003)*10'`
    : `x='(iw-iw/zoom)/2-sin(on*0.003)*10'`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imgPath)
      .inputOptions(['-loop 1', `-framerate ${fps}`, `-t ${duration}`])
      .complexFilter(
        `[0:v]format=yuv420p,` +
        `scale=${videoWidth * 2}:${videoHeight * 2}:force_original_aspect_ratio=increase,` +
        `crop=${videoWidth * 2}:${videoHeight * 2},` +
        `scale=${videoWidth}:${videoHeight},` +
        `zoompan=${zoomExpr}:${panX}:y='(ih-ih/zoom)/2':` +
        `d=${frames}:s=${videoWidth}x${videoHeight}:fps=${fps}[v]`
      )
      .outputOptions([
        '-map [v]',
        `-t ${duration}`,
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 15',
        '-pix_fmt yuv420p',
        `-r ${fps}`,
      ])
      .output(clipPath)
      .on('stderr', () => {})
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// ── Pass 2: xfade clips + audio + (optional) subtitles → final MP4 ────────────
function renderFinal({ clipPaths, audioPath, assPath, outputPath, totalDuration, fps, withSubs }) {
  const n = clipPaths.length;
  const clipDur = totalDuration / n;
  const fadeDur = Math.min(0.6, clipDur * 0.15);

  // Build xfade chain between real video files
  let filterParts = [];
  let prevLabel = '0:v';
  for (let i = 1; i < n; i++) {
    const offset = Math.max(0, clipDur * i - fadeDur).toFixed(3);
    const outLabel = i === n - 1 ? 'vconcat' : `xf${i}`;
    filterParts.push(`[${prevLabel}][${i}:v]xfade=transition=fade:duration=${fadeDur}:offset=${offset}[${outLabel}]`);
    prevLabel = outLabel;
  }
  if (n === 1) filterParts.push(`[0:v]copy[vconcat]`);

  // Subtitle tail filter
  let tailFilter;
  if (withSubs && assPath) {
    const absAss = path.resolve(assPath).replace(/\\/g, '/').replace(/([:\\])/g, '\\$1');
    tailFilter = `[vconcat]subtitles='${absAss}'[vout]`;
  } else {
    tailFilter = `[vconcat]copy[vout]`;
  }
  filterParts.push(tailFilter);

  const complexFilter = filterParts.join(';');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    clipPaths.forEach(p => cmd.input(p));
    cmd.input(audioPath);
    cmd
      .complexFilter(complexFilter)
      .outputOptions([
        '-map [vout]',
        `-map ${n}:a`,
        `-t ${totalDuration}`,
        '-c:v libx264',
        '-preset fast',
        '-crf 20',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        `-r ${fps}`,
      ])
      .output(outputPath)
      .on('start', () => console.log('   FFmpeg final render started...'))
      .on('stderr', (line) => {
        if (line.includes('Error') || line.includes('Invalid')) console.error('   FFmpeg:', line);
      })
      .on('progress', (p) => {
        if (p.percent) process.stdout.write(`\r   Rendering: ${p.percent.toFixed(1)}%`);
      })
      .on('end', () => { console.log('\n   ✓ Video rendered successfully!'); resolve(); })
      .on('error', reject)
      .run();
  });
}

async function renderVideo({ images, audioPath, words, audioDuration, outputPath }) {
  console.log('\n🎬 [Step 4] Rendering video with FFmpeg (two-pass)...');

  const workDir = path.dirname(outputPath);
  mkdirSync(workDir, { recursive: true });

  const { videoWidth, videoHeight, fps, secondsPerImage } = CONFIG;
  const totalDuration = audioDuration || images.length * secondsPerImage;
  const durationPerImage = totalDuration / images.length;

  // Write ASS subtitle file
  const assPath = path.join(workDir, 'captions.ass');
  writeAssSubtitles(words, assPath, videoWidth, videoHeight);

  // Pass 1: render each image to its own temp clip
  console.log(`   Pass 1: rendering ${images.length} clips...`);
  const clipPaths = [];
  for (let i = 0; i < images.length; i++) {
    const clipPath = path.join(workDir, `clip_${i}.mp4`);
    await renderClip(images[i], clipPath, durationPerImage, i, videoWidth, videoHeight, fps);
    console.log(`   ✓ clip ${i + 1}/${images.length}`);
    clipPaths.push(clipPath);
  }

  // Pass 2: xfade + audio + subtitles
  console.log('   Pass 2: compositing final video...');
  try {
    await renderFinal({ clipPaths, audioPath, assPath, outputPath, totalDuration, fps, withSubs: true });
  } catch {
    console.warn('   ⚠ Subtitles failed, retrying without captions…');
    await renderFinal({ clipPaths, audioPath, assPath: null, outputPath, totalDuration, fps, withSubs: false });
  }
}

// ─── Utility: Load Images ─────────────────────────────────────────────────────

function loadTestImages(dir) {
  const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const files = fs.readdirSync(dir)
    .filter((f) => validExts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.resolve(dir, f));

  if (files.length === 0) {
    throw new Error(`No images found in ${dir}. Add 5-7 .jpg/.png files.`);
  }
  if (files.length < 3) {
    console.warn(`   ⚠  Only ${files.length} image(s) found — recommend 5-7 for best results`);
  }

  console.log(`   Found ${files.length} image(s): ${files.map(f => path.basename(f)).join(', ')}`);
  return files;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════');
  console.log('  GetReelEstate — AI Video Pipeline (Phase 1)');
  console.log('═══════════════════════════════════════════════════');

  if (!CONFIG.zenmuxApiKey) {
    console.error('\n❌ Missing ZENMUX_API_KEY in .env file');
    process.exit(1);
  }
  // Ensure output dir exists
  mkdirSync(CONFIG.outputDir, { recursive: true });

  // Load images
  console.log(`\n📸 Loading images from ${CONFIG.imagesDir}/`);
  const images = loadTestImages(CONFIG.imagesDir);

  if (isDryRun) {
    console.log('\n🧪 Dry-run mode: skipping API calls and rendering.');
    console.log('   Pipeline structure looks good! Remove --dry-run to execute.');
    return;
  }

  // Step 1: Generate script
  const script = await generateScript(TEST_PROPERTY);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'script.txt'), script);

  // Step 2: Generate voiceover + word timestamps (Edge TTS returns both)
  const audioPath = path.join(CONFIG.outputDir, 'voiceover.mp3');
  const { words, duration } = await generateVoiceover(script, audioPath);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'timestamps.json'),
    JSON.stringify({ words, duration }, null, 2)
  );

  // Step 4: Render video
  const outputPath = path.join(CONFIG.outputDir, 'test_output.mp4');
  await renderVideo({
    images,
    audioPath,
    words,
    audioDuration: duration,
    outputPath,
  });

  // Done!
  const stats = fs.statSync(outputPath);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Pipeline complete!');
  console.log(`  📁 Output: ${path.resolve(outputPath)}`);
  console.log(`  📏 File size: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
  console.log('═══════════════════════════════════════════════════\n');
}

// 只有直接运行 (node pipeline.js) 时才执行 main()，被 import 时跳过
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('\n❌ Pipeline failed:', err.message);
    process.exit(1);
  });
}

// ─── Exported API for Worker ──────────────────────────────────────────────────

export async function runPipeline({ propertyDescription, imagePaths, workDir }) {
  mkdirSync(workDir, { recursive: true });

  const script = await generateScript(propertyDescription);
  fs.writeFileSync(path.join(workDir, 'script.txt'), script);

  const audioPath = path.join(workDir, 'voiceover.mp3');
  const { words, duration } = await generateVoiceover(script, audioPath);

  const outputPath = path.join(workDir, 'output.mp4');
  await renderVideo({ images: imagePaths, audioPath, words, audioDuration: duration, outputPath });

  return { videoPath: outputPath, script };
}
