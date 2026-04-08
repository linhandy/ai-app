import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? anonKey;

// Browser-safe client (anon key)
export const supabase = createClient(url, anonKey);

// Server-side admin client (service key, bypasses RLS)
export const supabaseAdmin = createClient(url, serviceKey);
