import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Upload test images
console.log('1. Uploading images...');
const urls = [];
for (let i = 1; i <= 5; i++) {
  const buf = fs.readFileSync(`../phase1/test-images/${i}.png`);
  const path = `e2e-test/img_${i}_${Date.now()}.png`;
  await sb.storage.from('reels').upload(path, buf, { upsert: true, contentType: 'image/png' });
  const { data: { publicUrl } } = sb.storage.from('reels').getPublicUrl(path);
  urls.push(publicUrl);
}
console.log(`   ✓ ${urls.length} images uploaded`);

// 2. Create paid task
console.log('2. Creating task (paid=true, skip Stripe)...');
const { data: task } = await sb.from('videos')
  .insert({
    prompt: '5BR/4BA luxury home in Scottsdale, AZ. $1.2M. Infinity pool, mountain views, gourmet kitchen, wine cellar. Just listed.',
    source_urls: urls,
    status: 'pending',
    paid: true,
  })
  .select('id').single();
console.log(`   ✓ Task: ${task.id}`);
console.log(`   → Open: http://localhost:3000/create?video_id=${task.id}`);

// 3. Wait for completion
console.log('3. Waiting for worker to render...');
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 10000));
  const { data } = await sb.from('videos')
    .select('status,video_url,error_msg')
    .eq('id', task.id).single();

  process.stdout.write(`   [${(i+1)*10}s] ${data.status}`);
  if (data.status === 'completed') {
    console.log(` ✅`);
    console.log(`\n🎬 Video URL: ${data.video_url}`);
    console.log(`🌐 Frontend: http://localhost:3000/create?video_id=${task.id}`);
    break;
  } else if (data.status === 'failed') {
    console.log(` ❌ ${data.error_msg}`);
    break;
  }
  console.log('');
}
