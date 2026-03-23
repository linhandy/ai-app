import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const videoId = process.argv[2] || '14b917b9-1861-4162-8c10-5cfe4f911436';
await sb.from('videos').update({ status: 'pending', error_msg: null }).eq('id', videoId);
console.log('✅ reset to pending:', videoId);
