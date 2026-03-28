/**
 * GetReelEstate — AI Video Pipeline (v2)
 *
 * Flow:
 *   1. LLM (Gemini via Zenmux) → 60-80 word voiceover script
 *   2. TTS (Microsoft Edge TTS) → voiceover.mp3 + word timestamps
 *   3. FFmpeg → cinematic video with varied camera movements, transitions,
 *      color grading, property info intro, CTA outro, and synced captions
 */

import 'dotenv/config';
import OpenAI from 'openai';
import { MsEdgeTTS, OUTPUT_FORMAT, MetadataOptions } from 'msedge-tts';
import fs, { mkdirSync } from 'fs';
import path from 'path';
import zlib from 'zlib';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a minimal solid-color PNG file (no external deps). */
function writeSolidPng(filePath, width, height, r, g, b) {
  // Minimal valid PNG: 8-byte sig + IHDR + IDAT (uncompressed) + IEND
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);           // chunk length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8;  // bit depth
  ihdr[17] = 2;  // color type: RGB
  ihdr[18] = 0;  // compression
  ihdr[19] = 0;  // filter
  ihdr[20] = 0;  // interlace
  const ihdrCrc = crc32(ihdr.subarray(4, 21));
  ihdr.writeInt32BE(ihdrCrc, 21);

  // Build raw image data: each row = filter byte (0) + RGB pixels
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    raw[off] = 0; // no filter
    for (let x = 0; x < width; x++) {
      raw[off + 1 + x * 3] = r;
      raw[off + 2 + x * 3] = g;
      raw[off + 3 + x * 3] = b;
    }
  }

  // Deflate (zlib) the raw data — use Node's built-in zlib
  const compressed = zlib.deflateSync(raw);

  // IDAT
  const idatData = Buffer.concat([Buffer.from('IDAT'), compressed]);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeInt32BE(crc32(idatData), 0);
  const idat = Buffer.concat([idatLen, idatData, idatCrc]);

  // IEND
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 0xAE, 0x42, 0x60, 0x82]);

  fs.writeFileSync(filePath, Buffer.concat([sig, ihdr, idat, iend]));
}

/** CRC32 for PNG chunks */
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) | 0;
}

/** Parse hex color "0xRRGGBB" to {r,g,b} */
function parseHexColor(hex) {
  const h = hex.replace('0x', '').replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err || !meta?.format?.duration) {
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
  llmModel: process.env.LLM_MODEL || 'google/gemini-2.5-flash',
  ttsVoice: process.env.TTS_VOICE || 'en-US-GuyNeural',
  outputDir: './output',
  imagesDir: './test-images',
  videoWidth: 1920,
  videoHeight: 1080,
  fps: 30,
  secondsPerImage: 5,
  introDuration: 3.5,
  outroDuration: 3,
};

const TEST_PROPERTY = `
  Stunning 4-bedroom, 3-bathroom home in Austin, TX.
  Listed at $875,000. 2,800 sq ft. Newly renovated open kitchen with
  quartz countertops, a resort-style backyard pool, 3-car garage, and
  a master suite with spa bath. Walking distance to top-rated schools.
  Move-in ready. Priced to sell fast.
`;

// ─── API Client ──────────────────────────────────────────────────────────────

const zenmuxClient = new OpenAI({
  apiKey: CONFIG.zenmuxApiKey,
  baseURL: CONFIG.zenmuxBaseURL,
});

// ─── Camera Movements ────────────────────────────────────────────────────────

/** Build zoompan x/y/z expressions for each movement type. */
function getCameraMovement(type, duration, fps) {
  const totalFrames = Math.floor(duration * fps);
  switch (type) {
    case 'zoomInCenter':
      return { z: "min(zoom+0.0008,1.18)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case 'zoomOutCenter':
      return { z: `max(1.18-on*${(0.18 / totalFrames).toFixed(6)},1.0)`, x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
    case 'panLeft': {
      const panSpeed = (0.18 / totalFrames).toFixed(6);
      return { z: "1.15", x: `iw*0.30/zoom-on*${panSpeed}*iw/zoom`, y: "ih/2-(ih/zoom/2)" };
    }
    case 'panRight': {
      const panSpeed = (0.18 / totalFrames).toFixed(6);
      return { z: "1.15", x: `iw*0.05/zoom+on*${panSpeed}*iw/zoom`, y: "ih/2-(ih/zoom/2)" };
    }
    case 'panDown': {
      const panSpeed = (0.15 / totalFrames).toFixed(6);
      return { z: "1.15", x: "iw/2-(iw/zoom/2)", y: `ih*0.02/zoom+on*${panSpeed}*ih/zoom` };
    }
    case 'zoomInTopLeft':
      return { z: "min(zoom+0.0008,1.18)", x: "iw/3-(iw/zoom/3)", y: "ih/3-(ih/zoom/3)" };
    default:
      return { z: "min(zoom+0.0008,1.18)", x: "iw/2-(iw/zoom/2)", y: "ih/2-(ih/zoom/2)" };
  }
}

// ─── Video Style Definitions ─────────────────────────────────────────────────

const VIDEO_STYLES = {
  energetic: {
    label: 'Energetic',
    systemPrompt: `You are an elite real estate marketing copywriter.
Write punchy, high-energy voiceover scripts for social media reels.
Style: Direct, exciting, like a top-performing realtor talking to camera.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use strong selling language (dream home, once-in-a-lifetime, act fast, etc.)
- End with a clear call to action (e.g. "DM me NOW", "Link in bio to book a tour")`,
    transitions: ['wipeleft', 'wiperight', 'slideup', 'slidedown', 'fade'],
    cameraMovements: ['zoomInCenter', 'panRight', 'zoomOutCenter', 'panLeft', 'panDown', 'zoomInTopLeft'],
    colorGrade: 'eq=brightness=0.04:saturation=1.18:contrast=1.06',
    colorBalance: 'colorbalance=rs=0.03:gs=0.01:bs=-0.02',
    vignette: false,
    fadeDuration: 0.5,
    introBg: '0x1a1a2e',
    introAccent: '0xf59e0b',
    ctaText: 'DM for Details  \\·  Link in Bio',
  },
  luxury: {
    label: 'Luxury',
    systemPrompt: `You are a luxury real estate marketing copywriter for high-end properties.
Write elegant, sophisticated voiceover scripts for premium property videos.
Style: Refined, aspirational, like a luxury concierge presenting an exclusive estate.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use premium language (exquisite, unparalleled, bespoke, masterfully crafted, etc.)
- Emphasize lifestyle, exclusivity, and prestige
- End with an inviting call to action (e.g. "Schedule your private showing today")`,
    transitions: ['fade', 'dissolve', 'smoothleft', 'smoothright'],
    cameraMovements: ['zoomInCenter', 'zoomOutCenter', 'panRight', 'panLeft', 'zoomInTopLeft', 'panDown'],
    colorGrade: 'eq=brightness=0.02:saturation=1.08:contrast=1.04',
    colorBalance: 'colorbalance=rs=0.02:gs=0.01:bs=0.01',
    vignette: true,
    fadeDuration: 0.8,
    introBg: '0x0d1117',
    introAccent: '0xd4af37',
    ctaText: 'Schedule Your Private Showing',
  },
  cinematic: {
    label: 'Cinematic',
    systemPrompt: `You are a cinematic storyteller for real estate video content.
Write dramatic, visually evocative voiceover scripts that paint a picture.
Style: Narrative, atmospheric, like a movie trailer narrator.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use vivid imagery and sensory language (imagine, picture this, sunlight pours through, etc.)
- Build dramatic tension and end with a powerful reveal
- End with a compelling call to action`,
    transitions: ['fade', 'circlecrop', 'dissolve', 'smoothleft', 'fade'],
    cameraMovements: ['zoomOutCenter', 'panLeft', 'zoomInCenter', 'panRight', 'panDown', 'zoomInTopLeft'],
    colorGrade: 'eq=brightness=-0.01:saturation=1.05:contrast=1.10',
    colorBalance: 'colorbalance=rs=0.01:gs=-0.01:bs=0.02',
    vignette: true,
    fadeDuration: 0.7,
    introBg: '0x0a0a0a',
    introAccent: '0xe2e8f0',
    ctaText: 'Experience It In Person',
  },
  warm: {
    label: 'Warm & Inviting',
    systemPrompt: `You are a friendly neighborhood real estate agent creating welcoming property videos.
Write warm, relatable voiceover scripts that make viewers feel at home.
Style: Friendly, genuine, like a trusted neighbor showing you around.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use warm, family-oriented language (welcome home, perfect for family gatherings, cozy, etc.)
- Focus on livability, community, and making memories
- End with an approachable call to action (e.g. "Come see it for yourself!")`,
    transitions: ['fade', 'smoothleft', 'smoothright', 'dissolve', 'fade'],
    cameraMovements: ['zoomInCenter', 'panRight', 'zoomOutCenter', 'panDown', 'panLeft', 'zoomInTopLeft'],
    colorGrade: 'eq=brightness=0.04:saturation=1.15:contrast=1.04',
    colorBalance: 'colorbalance=rs=0.05:gs=0.02:bs=-0.03',
    vignette: false,
    fadeDuration: 0.6,
    introBg: '0x1c1917',
    introAccent: '0xfbbf24',
    ctaText: 'Come See It for Yourself!',
  },
  modern: {
    label: 'Modern Minimalist',
    systemPrompt: `You are a modern real estate copywriter specializing in clean, minimal content.
Write sleek, concise voiceover scripts with a contemporary edge.
Style: Clean, confident, like a tech-forward real estate brand.
Rules:
- Exactly 60-80 English words
- No markdown, no bullet points — plain flowing sentences only
- Use crisp, modern language (smart design, seamless living, curated spaces, etc.)
- Focus on design, efficiency, and modern lifestyle
- End with a sharp call to action`,
    transitions: ['wipeleft', 'slideup', 'fade', 'wiperight', 'slidedown'],
    cameraMovements: ['panRight', 'zoomInCenter', 'panLeft', 'zoomOutCenter', 'panDown', 'zoomInTopLeft'],
    colorGrade: 'eq=brightness=0.02:saturation=1.05:contrast=1.08',
    colorBalance: 'colorbalance=rs=0.00:gs=0.00:bs=0.02',
    vignette: false,
    fadeDuration: 0.45,
    introBg: '0x111827',
    introAccent: '0x60a5fa',
    ctaText: 'Book a Tour Today',
  },
};

/** Parse "[style:xxx]\n..." prefix from prompt */
function parseStyledPrompt(prompt) {
  const match = prompt.match(/^\[style:(\w+)\]\n?([\s\S]*)$/);
  if (match) return { style: match[1], description: match[2].trim() };
  return { style: 'energetic', description: prompt };
}

/** Extract property info from description for intro card */
function parsePropertyInfo(description) {
  const price = description.match(/\$[\d,]+(?:K)?/i)?.[0] || '';
  const beds = description.match(/(\d+)\s*(?:BR|bed|bedroom)/i)?.[1] || '';
  const baths = description.match(/(\d+)\s*(?:BA|bath|bathroom)/i)?.[1] || '';
  const sqft = description.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i)?.[1] || '';
  // Try to find city/state
  const location = description.match(/(?:in|home in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:,\s*[A-Z]{2})?)/)?.[1] || '';
  // Try to find street address
  const address = description.match(/(\d+\s+[\w\s]+(?:St|Dr|Ave|Blvd|Cir|Ln|Rd|Way|Ct|Pl))/i)?.[0] || '';
  return { price, beds, baths, sqft, location, address };
}

// ─── Step 1: Generate Voiceover Script (with retry) ─────────────────────────

async function generateScript(propertyDescription) {
  console.log('\n📝 [Step 1] Generating voiceover script...');

  const { style, description } = parseStyledPrompt(propertyDescription);
  const styleConfig = VIDEO_STYLES[style] || VIDEO_STYLES.energetic;
  console.log(`   Style: ${styleConfig.label}`);

  const MAX_RETRIES = 5;
  const TIMEOUT_MS = 30_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const completion = await zenmuxClient.chat.completions.create(
        {
          model: CONFIG.llmModel,
          messages: [
            { role: 'system', content: styleConfig.systemPrompt },
            { role: 'user', content: `Write a 60-80 word voiceover script for this property:\n\n${description}` },
          ],
        },
        { signal: controller.signal },
      );
      clearTimeout(timer);

      const script = completion.choices[0].message.content.trim();
      const wordCount = script.split(/\s+/).length;
      console.log(`   ✓ Script generated (${wordCount} words) on attempt ${attempt}`);
      console.log(`   "${script.slice(0, 80)}..."`);
      return script;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      const delay = 3000 * attempt;
      console.log(`   ⚠ LLM attempt ${attempt} failed (${e.message ?? e}), retrying in ${delay / 1000}s…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── Step 2: Text-to-Speech + Word Timestamps ───────────────────────────────

async function generateVoiceover(script, outputPath) {
  console.log('\n🎙️  [Step 2] Generating voiceover (Edge TTS + WordBoundary)...');
  console.log(`   Voice: ${CONFIG.ttsVoice}`);

  const metaOpts = new MetadataOptions();
  metaOpts.wordBoundaryEnabled = true;

  const workDir = path.dirname(outputPath);
  const tmpDir  = path.join(workDir, '_tts_tmp');
  mkdirSync(tmpDir, { recursive: true });

  const { ProsodyOptions } = await import('msedge-tts').then(m => m);
  const prosody = new ProsodyOptions();
  prosody.rate = '-20%';

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

  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`TTS audio file missing after generation: ${audioFilePath}`);
  }

  fs.copyFileSync(audioFilePath, outputPath);
  try { fs.unlinkSync(audioFilePath); } catch { /* tmpDir cleaned later */ }

  let words = [];
  if (metadataFilePath) {
    const raw = JSON.parse(fs.readFileSync(metadataFilePath, 'utf8'));
    words = (raw.Metadata || [])
      .filter(e => e.Type === 'WordBoundary')
      .map(e => ({
        word:  e.Data.text.Text,
        start: parseFloat((e.Data.Offset / 10_000_000).toFixed(3)),
        end:   parseFloat(((e.Data.Offset + e.Data.Duration) / 10_000_000).toFixed(3)),
      }));
  }

  const duration = await getAudioDuration(outputPath);
  const stats    = fs.statSync(outputPath);
  console.log(`   ✓ Audio saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB, ${duration.toFixed(1)}s)`);
  console.log(`   ✓ ${words.length} real WordBoundary timestamps`);

  return { audioPath: outputPath, words, duration };
}

// ─── Step 3: Write ASS Subtitles (upgraded styling) ─────────────────────────

function writeAssSubtitles(words, assPath, videoWidth, videoHeight, introOffset = 0) {
  const WORDS_PER_LINE = 5;
  const fontSize = Math.floor(videoHeight * 0.058);
  const marginV  = Math.floor(videoHeight * 0.08);
  const outline  = 6;
  const shadow   = 3;

  const toAssTime = (s) => {
    const t = s + introOffset;
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = (t % 60).toFixed(2).padStart(5, '0');
    return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  };

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
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Line,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H96000000,-1,0,0,0,100,100,1,0,3,${outline},${shadow},2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events = lines.map(({ text, start, end }) =>
    `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Line,,0,0,0,,{\\an2}${text}`
  ).join('\n');

  fs.writeFileSync(assPath, header + events);
}

// ─── Step 4: Render Video ───────────────────────────────────────────────────

/** Render intro card with property info using FFmpeg drawtext */
function renderIntroCard(outputPath, propertyInfo, styleConfig, videoWidth, videoHeight, fps, duration) {
  const bg = styleConfig.introBg;
  const accent = styleConfig.introAccent;

  // Build drawtext filters
  const filters = [];
  let y = 0.28;

  if (propertyInfo.price) {
    filters.push(
      `drawtext=text='${propertyInfo.price}':fontsize=${Math.floor(videoHeight * 0.09)}:fontcolor=${accent}:` +
      `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:` +
      `x=(w-text_w)/2:y=h*${y}`
    );
    y += 0.14;
  }

  const loc = propertyInfo.address || propertyInfo.location;
  if (loc) {
    const safeText = loc.replace(/'/g, "'\\\\\\''");
    filters.push(
      `drawtext=text='${safeText}':fontsize=${Math.floor(videoHeight * 0.042)}:fontcolor=white:` +
      `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
      `x=(w-text_w)/2:y=h*${y}`
    );
    y += 0.10;
  }

  const specs = [
    propertyInfo.beds ? `${propertyInfo.beds} Beds` : '',
    propertyInfo.baths ? `${propertyInfo.baths} Baths` : '',
    propertyInfo.sqft ? `${propertyInfo.sqft} Sq Ft` : '',
  ].filter(Boolean).join('  \\·  ');

  if (specs) {
    filters.push(
      `drawtext=text='${specs}':fontsize=${Math.floor(videoHeight * 0.035)}:fontcolor=0xcccccc:` +
      `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
      `x=(w-text_w)/2:y=h*${y}`
    );
  }

  // Add a subtle line accent
  filters.push(
    `drawtext=text='━━━━━━━━━━':fontsize=${Math.floor(videoHeight * 0.025)}:fontcolor=${accent}@0.4:` +
    `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
    `x=(w-text_w)/2:y=h*0.70`
  );

  const filterChain = filters.length > 0 ? ',' + filters.join(',') : '';

  // Generate a solid-color PNG (avoids -f lavfi which isn't available in ffmpeg-static)
  const bgPng = outputPath.replace(/\.mp4$/, '_bg.png');
  const { r, g, b } = parseHexColor(bg);
  writeSolidPng(bgPng, videoWidth, videoHeight, r, g, b);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgPng)
      .inputOptions(['-loop 1', `-framerate ${fps}`, `-t ${duration}`])
      .complexFilter(
        `[0:v]format=yuv420p${filterChain}[v]`
      )
      .outputOptions([
        '-map [v]',
        `-t ${duration}`,
        '-c:v libx264', '-preset ultrafast', '-crf 18',
        '-pix_fmt yuv420p', `-r ${fps}`,
      ])
      .output(outputPath)
      .on('stderr', () => {})
      .on('end', () => { try { fs.unlinkSync(bgPng); } catch {}; resolve(); })
      .on('error', reject)
      .run();
  });
}

/** Render outro CTA card */
function renderOutroCard(outputPath, ctaText, styleConfig, videoWidth, videoHeight, fps, duration) {
  const bg = styleConfig.introBg;
  const accent = styleConfig.introAccent;
  const safeText = ctaText.replace(/'/g, "'\\\\\\''");

  // Generate solid-color PNG (avoids -f lavfi)
  const bgPng = outputPath.replace(/\.mp4$/, '_bg.png');
  const { r, g, b } = parseHexColor(bg);
  writeSolidPng(bgPng, videoWidth, videoHeight, r, g, b);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(bgPng)
      .inputOptions(['-loop 1', `-framerate ${fps}`, `-t ${duration}`])
      .complexFilter(
        `[0:v]format=yuv420p,` +
        `drawtext=text='${safeText}':fontsize=${Math.floor(videoHeight * 0.05)}:fontcolor=${accent}:` +
        `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:` +
        `x=(w-text_w)/2:y=(h-text_h)/2,` +
        `drawtext=text='GetReelEstate':fontsize=${Math.floor(videoHeight * 0.025)}:fontcolor=0x666666:` +
        `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:` +
        `x=(w-text_w)/2:y=h*0.72[v]`
      )
      .outputOptions([
        '-map [v]',
        `-t ${duration}`,
        '-c:v libx264', '-preset ultrafast', '-crf 18',
        '-pix_fmt yuv420p', `-r ${fps}`,
      ])
      .output(outputPath)
      .on('stderr', () => {})
      .on('end', () => { try { fs.unlinkSync(bgPng); } catch {}; resolve(); })
      .on('error', reject)
      .run();
  });
}

/** Pass 1: render single image → temp MP4 clip with camera movement */
function renderClip(imgPath, clipPath, duration, idx, videoWidth, videoHeight, fps, movementType) {
  const movement = getCameraMovement(movementType, duration, fps);
  const scaleFactor = 2; // 2x for 1080p (was 3x at 720p)

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imgPath)
      .inputOptions(['-loop 1', `-framerate ${fps}`, `-t ${duration}`])
      .complexFilter(
        `[0:v]format=yuv420p,` +
        `scale=${videoWidth * scaleFactor}:${videoHeight * scaleFactor}:force_original_aspect_ratio=increase,` +
        `crop=${videoWidth * scaleFactor}:${videoHeight * scaleFactor},` +
        `scale=${videoWidth}:${videoHeight},` +
        `zoompan=z='${movement.z}':x='${movement.x}':y='${movement.y}':` +
        `d=1:fps=${fps}:s=${videoWidth}x${videoHeight}[v]`
      )
      .outputOptions([
        '-map [v]',
        `-t ${duration}`,
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 18',
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

/** Pass 2: xfade + color grading + audio (delayed) + subtitles → final MP4 */
function renderFinal({ clipPaths, audioPath, assPath, outputPath, clipDurations, fps, withSubs, styleConfig, introDelay }) {
  const n = clipPaths.length;
  const fadeDur = styleConfig.fadeDuration || 0.6;
  const transitions = styleConfig.transitions || ['fade'];

  // Build xfade chain with varied transitions
  let filterParts = [];
  let prevLabel = '0:v';
  let cumulativeOffset = 0;

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      cumulativeOffset = clipDurations[0];
      continue;
    }
    const transition = transitions[(i - 1) % transitions.length];
    const offset = Math.max(0, cumulativeOffset - fadeDur).toFixed(3);
    const outLabel = i === n - 1 ? 'vconcat' : `xf${i}`;
    filterParts.push(`[${prevLabel}][${i}:v]xfade=transition=${transition}:duration=${fadeDur}:offset=${offset}[${outLabel}]`);
    prevLabel = outLabel;
    cumulativeOffset += clipDurations[i] - fadeDur;
  }
  if (n === 1) filterParts.push(`[0:v]copy[vconcat]`);

  // Color grading
  const colorGrade = styleConfig.colorGrade || 'eq=brightness=0.03:saturation=1.10:contrast=1.05';
  const colorBalance = styleConfig.colorBalance || '';
  const vignetteFilter = styleConfig.vignette ? ',vignette=PI/5' : '';
  const colorChain = colorBalance
    ? `[vconcat]${colorGrade},${colorBalance}${vignetteFilter}[vgraded]`
    : `[vconcat]${colorGrade}${vignetteFilter}[vgraded]`;
  filterParts.push(colorChain);

  // Subtitles
  if (withSubs && assPath) {
    const absAss = path.resolve(assPath).replace(/\\/g, '/').replace(/([:\\])/g, '\\$1');
    filterParts.push(`[vgraded]subtitles='${absAss}'[vout]`);
  } else {
    filterParts.push(`[vgraded]copy[vout]`);
  }

  // Audio delay (offset voiceover to start after intro)
  const audioInputIdx = n;
  const delayMs = Math.round((introDelay || 0) * 1000);
  if (delayMs > 0) {
    filterParts.push(`[${audioInputIdx}:a]adelay=${delayMs}|${delayMs}[aout]`);
  }

  const complexFilter = filterParts.join(';');
  const totalDuration = cumulativeOffset + fadeDur; // approximate

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    clipPaths.forEach(p => cmd.input(p));
    cmd.input(audioPath);
    cmd
      .complexFilter(complexFilter)
      .outputOptions([
        '-map [vout]',
        delayMs > 0 ? '-map [aout]' : `-map ${audioInputIdx}:a`,
        `-t ${totalDuration + 1}`, // +1s safety margin
        '-c:v libx264',
        '-preset fast',
        '-crf 20',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        `-r ${fps}`,
        '-shortest',
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

async function renderVideo({ images, audioPath, words, audioDuration, outputPath, styleConfig, propertyDescription }) {
  console.log('\n🎬 [Step 4] Rendering cinematic video with FFmpeg...');

  const workDir = path.dirname(outputPath);
  mkdirSync(workDir, { recursive: true });

  const { videoWidth, videoHeight, fps, secondsPerImage, introDuration, outroDuration } = CONFIG;
  const totalAudioDuration = audioDuration || images.length * secondsPerImage;
  const durationPerImage = totalAudioDuration / images.length;

  // Extract property info for intro card
  let descText = propertyDescription || '';
  if (!descText) {
    try {
      const descFile = path.join(workDir, 'description.txt');
      if (fs.existsSync(descFile)) descText = fs.readFileSync(descFile, 'utf8');
    } catch { /* ignore */ }
  }
  const propertyInfo = parsePropertyInfo(descText);

  const clipPaths = [];
  const clipDurations = [];

  // Render intro card
  const hasIntro = propertyInfo.price || propertyInfo.beds;
  if (hasIntro) {
    console.log('   Rendering intro card...');
    const introPath = path.join(workDir, 'clip_intro.mp4');
    await renderIntroCard(introPath, propertyInfo, styleConfig, videoWidth, videoHeight, fps, introDuration);
    clipPaths.push(introPath);
    clipDurations.push(introDuration);
    console.log('   ✓ intro card');
  }

  // Pass 1: render each image with varied camera movements
  const movements = styleConfig.cameraMovements || ['zoomInCenter'];
  console.log(`   Pass 1: rendering ${images.length} clips with varied camera movements...`);
  for (let i = 0; i < images.length; i++) {
    const clipPath = path.join(workDir, `clip_${i}.mp4`);
    const movementType = movements[i % movements.length];
    await renderClip(images[i], clipPath, durationPerImage, i, videoWidth, videoHeight, fps, movementType);
    console.log(`   ✓ clip ${i + 1}/${images.length} (${movementType})`);
    clipPaths.push(clipPath);
    clipDurations.push(durationPerImage);
  }

  // Render outro card
  console.log('   Rendering outro card...');
  const outroPath = path.join(workDir, 'clip_outro.mp4');
  await renderOutroCard(outroPath, styleConfig.ctaText, styleConfig, videoWidth, videoHeight, fps, outroDuration);
  clipPaths.push(outroPath);
  clipDurations.push(outroDuration);
  console.log('   ✓ outro card');

  // Write ASS subtitles (offset by intro duration)
  const assPath = path.join(workDir, 'captions.ass');
  const introOffset = hasIntro ? introDuration : 0;
  writeAssSubtitles(words, assPath, videoWidth, videoHeight, introOffset);

  // Pass 2: composite with transitions, color grading, audio, subtitles
  console.log('   Pass 2: compositing final video with color grading...');
  try {
    await renderFinal({
      clipPaths, audioPath, assPath, outputPath, clipDurations, fps,
      withSubs: true, styleConfig, introDelay: introOffset,
    });
  } catch (err) {
    console.warn('   ⚠ Subtitles failed, retrying without captions…', err.message);
    await renderFinal({
      clipPaths, audioPath, assPath: null, outputPath, clipDurations, fps,
      withSubs: false, styleConfig, introDelay: introOffset,
    });
  }
}

// ─── Utility: Load Images ─────────────────────────────────────────────────────

function loadTestImages(dir) {
  const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const files = fs.readdirSync(dir)
    .filter((f) => validExts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.resolve(dir, f));

  if (files.length === 0) throw new Error(`No images found in ${dir}.`);
  if (files.length < 3) console.warn(`   ⚠  Only ${files.length} image(s) — recommend 5-7`);

  console.log(`   Found ${files.length} image(s): ${files.map(f => path.basename(f)).join(', ')}`);
  return files;
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('═══════════════════════════════════════════════════');
  console.log('  GetReelEstate — AI Video Pipeline (v2)');
  console.log('═══════════════════════════════════════════════════');

  if (!CONFIG.zenmuxApiKey) {
    console.error('\n❌ Missing ZENMUX_API_KEY in .env file');
    process.exit(1);
  }
  mkdirSync(CONFIG.outputDir, { recursive: true });

  console.log(`\n📸 Loading images from ${CONFIG.imagesDir}/`);
  const images = loadTestImages(CONFIG.imagesDir);

  if (isDryRun) {
    console.log('\n🧪 Dry-run mode: skipping API calls and rendering.');
    return;
  }

  const script = await generateScript(TEST_PROPERTY);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'script.txt'), script);

  const audioPath = path.join(CONFIG.outputDir, 'voiceover.mp3');
  const { words, duration } = await generateVoiceover(script, audioPath);
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'timestamps.json'),
    JSON.stringify({ words, duration }, null, 2)
  );

  const outputPath = path.join(CONFIG.outputDir, 'test_output.mp4');
  const styleConfig = VIDEO_STYLES.energetic;
  await renderVideo({
    images, audioPath, words, audioDuration: duration, outputPath, styleConfig,
    propertyDescription: TEST_PROPERTY,
  });

  const stats = fs.statSync(outputPath);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ Pipeline complete!');
  console.log(`  📁 Output: ${path.resolve(outputPath)}`);
  console.log(`  📏 File size: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
  console.log('═══════════════════════════════════════════════════\n');
}

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

  const { style, description } = parseStyledPrompt(propertyDescription);
  const styleConfig = VIDEO_STYLES[style] || VIDEO_STYLES.energetic;

  const script = await generateScript(propertyDescription);
  fs.writeFileSync(path.join(workDir, 'script.txt'), script);
  // Save original description for property info extraction
  fs.writeFileSync(path.join(workDir, 'description.txt'), description);

  const audioPath = path.join(workDir, 'voiceover.mp3');
  const { words, duration } = await generateVoiceover(script, audioPath);

  const outputPath = path.join(workDir, 'output.mp4');
  await renderVideo({
    images: imagePaths, audioPath, words, audioDuration: duration, outputPath, styleConfig,
    propertyDescription: description,
  });

  return { videoPath: outputPath, script };
}
