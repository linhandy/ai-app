import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const videoId = process.argv[2] || '14b917b9-1861-4162-8c10-5cfe4f911436';
const { data } = await sb.from('videos')
  .select('id,status,paid,video_url,script,error_msg')
  .eq('id', videoId)
  .single();
console.log(JSON.stringify(data, null, 2));
