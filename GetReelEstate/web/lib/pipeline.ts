/**
 * GetReelEstate — Video Generation Pipeline (Web)
 * LLM (Zenmux) → Edge TTS + WordBoundary → FFmpeg 16:9 render
 */

import OpenAI from 'openai';
import { MsEdgeTTS, OUTPUT_FORMAT, MetadataOptions } from 'msedge-tts';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs, { mkdirSync } from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegStatic as string);

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_W  = 1280;
const VIDEO_H  = 720;
const FPS      = 30;
const FADE_DUR = 0.5;

// ─── Clients ─────────────────────────────────────────────────────────────────

const zenmux = new OpenAI({
  apiKey:  process.env.ZENMUX_API_KEY!,
  baseURL: process.env.ZENMUX_BASE_URL || 'https://zenmux.ai/api/v1',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise(resolve => {
    (ffmpeg as any).ffprobe(filePath, (err: any, meta: any) => {
      if (err || !meta?.format?.duration) {
        resolve(fs.statSync(filePath).size / 12000);
      } else {
        resolve(meta.format.duration as number);
      }
    });
  });
}

// ─── Step 1: Generate script ─────────────────────────────────────────────────

export async function generateScript(propertyDescription: string): Promise<string> {
  const res = await zenmux.chat.completions.create({
    model: process.env.LLM_MODEL || 'google/gemini-3-pro-preview',
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
  return res.choices[0].message.content!.trim();
}

// ─── Step 2: TTS + real WordBoundary timestamps ───────────────────────────────

export interface WordTimestamp {
  word:  string;
  start: number;
  end:   number;
}

export async function generateVoiceover(
  script: string,
  outputPath: string,
): Promise<{ words: WordTimestamp[]; duration: number }> {
  const voice = process.env.TTS_VOICE || 'en-US-GuyNeural';

  const meta = new (MetadataOptions as any)();
  meta.wordBoundaryEnabled = true;

  const tts = new MsEdgeTTS();
  await (tts as any).setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, meta);

  // -20% rate: relaxed showcase pacing ~40s for 80 words
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><prosody rate="-20%">${script}</prosody></voice></speak>`;

  const tmpDir = path.join(path.dirname(outputPath), '_tts_tmp');
  mkdirSync(tmpDir, { recursive: true });

  const { audioFilePath, metadataFilePath } = await (tts as any).rawToFile(tmpDir, ssml) as any;
  fs.renameSync(audioFilePath, outputPath);

  let words: WordTimestamp[] = [];
  if (metadataFilePath) {
    const raw = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8')) as any;
    words = (raw.Metadata || [])
      .filter((e: any) => e.Type === 'WordBoundary')
      .map((e: any) => ({
        word:  e.Data.text.Text as string,
        start: parseFloat((e.Data.Offset / 10_000_000).toFixed(3)),
        end:   parseFloat(((e.Data.Offset + e.Data.Duration) / 10_000_000).toFixed(3)),
      }));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const duration = await getAudioDuration(outputPath);
  return { words, duration };
}

// ─── Step 3: Write ASS subtitles (line-by-line, bottom-center) ───────────────

function writeAssSubtitles(words: WordTimestamp[], assPath: string): void {
  const WORDS_PER_LINE = 7;
  const fontSize = Math.floor(VIDEO_H * 0.068);
  const marginV  = Math.floor(VIDEO_H * 0.06);

  const toAssTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = (s % 60).toFixed(2).padStart(5, '0');
    return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  };

  const lines: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_LINE) {
    const chunk = words.slice(i, i + WORDS_PER_LINE);
    lines.push({
      text:  chunk.map(w => w.word.replace(/[{}\\]/g, '')).join(' '),
      start: chunk[0].start,
      end:   chunk[chunk.length - 1].end,
    });
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${VIDEO_W}
PlayResY: ${VIDEO_H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Line,Arial,${fontSize},&H00FFFFFF,&H00000000,&HB0000000,-1,0,0,3,0,0,2,30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = lines
    .map(({ text, start, end }) =>
      `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Line,,0,0,0,,{\\an2}${text}`,
    )
    .join('\n');

  fs.writeFileSync(assPath, header + events);
}

// ─── Step 4: Render video ────────────────────────────────────────────────────

export async function renderVideo(params: {
  imagePaths: string[];
  audioPath:  string;
  words:      WordTimestamp[];
  duration:   number;
  outputPath: string;
}): Promise<void> {
  const { imagePaths, audioPath, words, duration, outputPath } = params;
  const n              = imagePaths.length;
  const durPerImg      = duration / n;
  const effectiveDur   = durPerImg - FADE_DUR;

  const assPath = outputPath.replace('.mp4', '.ass');
  writeAssSubtitles(words, assPath);

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    imagePaths.forEach(p =>
      cmd.input(p).inputOptions(['-loop 1', `-t ${durPerImg}`, '-framerate 30']),
    );
    cmd.input(audioPath);

    // Ken Burns on each image
    const scaleFilters = imagePaths.map((_, i) => {
      const frames   = Math.floor(durPerImg * FPS);
      const zoomStep = (0.3 / frames).toFixed(6);
      const zoomExpr = i % 2 === 0
        ? `zoom='min(zoom+${zoomStep},1.3)'`
        : `zoom='max(zoom-${zoomStep},1.0)'`;
      return (
        `[${i}:v]scale=${VIDEO_W * 2}:${VIDEO_H * 2}:force_original_aspect_ratio=increase,` +
        `crop=${VIDEO_W * 2}:${VIDEO_H * 2},scale=${VIDEO_W}:${VIDEO_H},` +
        `zoompan=${zoomExpr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
        `d=${frames}:s=${VIDEO_W}x${VIDEO_H}:fps=${FPS},setpts=PTS-STARTPTS[v${i}]`
      );
    }).join(';');

    // xfade transitions
    let xfadeChain = '';
    let prev = 'v0';
    for (let i = 1; i < n; i++) {
      const offset = (effectiveDur * i).toFixed(3);
      const out    = i === n - 1 ? 'vconcat' : `xf${i}`;
      xfadeChain += `;[${prev}][v${i}]xfade=transition=fade:duration=${FADE_DUR}:offset=${offset}[${out}]`;
      prev = out;
    }
    if (n === 1) xfadeChain = ';[v0]copy[vconcat]';

    const assEsc     = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const subsFilter = `[vconcat]subtitles='${assEsc}':fontsdir='C\\:/Windows/Fonts'[vout]`;

    cmd
      .complexFilter(`${scaleFilters}${xfadeChain};${subsFilter}`)
      .outputOptions([
        '-map [vout]', `-map ${n}:a`, `-t ${duration}`,
        '-c:v libx264', '-preset fast', '-crf 22',
        '-c:a aac', '-b:a 192k', '-pix_fmt yuv420p',
        '-movflags +faststart', `-r ${FPS}`,
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export async function runPipeline(params: {
  propertyDescription: string;
  imagePaths:          string[];
  workDir:             string;
}): Promise<{ videoPath: string; script: string }> {
  const { propertyDescription, imagePaths, workDir } = params;
  mkdirSync(workDir, { recursive: true });

  const script = await generateScript(propertyDescription);
  fs.writeFileSync(path.join(workDir, 'script.txt'), script);

  const audioPath     = path.join(workDir, 'voiceover.mp3');
  const { words, duration } = await generateVoiceover(script, audioPath);

  const videoPath = path.join(workDir, 'output.mp4');
  await renderVideo({ imagePaths, audioPath, words, duration, outputPath: videoPath });

  return { videoPath, script };
}
