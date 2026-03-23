/**
 * One-off script: generate a demo video from the Austin listing
 * and upload it to Supabase Storage as 'demo/output.mp4'.
 * Run: node generate-demo.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { runPipeline } from './pipeline.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PHOTO_URLS = [
  'https://photos.zillowstatic.com/fp/19f50fcfad0e24a1a8e49787a41f5c2e-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/506837ba617ca729d59d46be7e01af3c-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/454c9488bb5be80f4f5e72ae03956eb7-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/64c84a2522a77476777d88e51b6cd1b1-cc_ft_1536.jpg',
  'https://photos.zillowstatic.com/fp/e9435fc1d1845f8ffd4596ffc407db84-cc_ft_1536.jpg',
];

const PROPERTY_DESC = `
  Stunning 5-bedroom, 5-bathroom luxury home on the iconic 18th hole of the University of Texas Golf Club
  in exclusive Steiner Ranch, Austin TX. Listed at $1,700,000. 4,820 sq ft of refined Hill Country elegance.
  Sweeping panoramic views, gourmet built-in kitchen with wine refrigerator and bar fridge,
  resort-style outdoor entertaining, 4-car garage. Gated community with golf, lake, pool and clubhouse.
  The ultimate Austin lifestyle. Move-in ready.
`;

async function main() {
  const workDir = path.join(os.tmpdir(), `getreel-demo-${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  console.log('Downloading images...');
  const imagePaths = [];
  for (let i = 0; i < PHOTO_URLS.length; i++) {
    const res = await fetch(PHOTO_URLS[i]);
    if (!res.ok) throw new Error(`Failed: ${PHOTO_URLS[i]}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const imgPath = path.join(workDir, `img_${i}.jpg`);
    fs.writeFileSync(imgPath, buf);
    imagePaths.push(imgPath);
    console.log(`  ✓ img_${i}.jpg`);
  }

  console.log('\nRunning pipeline (LLM + TTS + FFmpeg)...');
  const { videoPath, script } = await runPipeline({
    propertyDescription: PROPERTY_DESC,
    imagePaths,
    workDir,
  });

  console.log('\nUploading to Supabase Storage...');
  const videoBuffer = fs.readFileSync(videoPath);
  const { error } = await supabase.storage
    .from('reels')
    .upload('demo/output.mp4', videoBuffer, { contentType: 'video/mp4', upsert: true });

  if (error) throw new Error('Upload failed: ' + error.message);

  const { data: { publicUrl } } = supabase.storage
    .from('reels')
    .getPublicUrl('demo/output.mp4');

  console.log('\n✅ Demo video ready!');
  console.log('Public URL:', publicUrl);
  console.log('\nScript:', script);

  fs.rmSync(workDir, { recursive: true, force: true });
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
