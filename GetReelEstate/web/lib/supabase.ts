import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 前端用（anon key，受 RLS 限制）
export const supabase = createClient(url, anon);

// 服务端用（service_role，绕过 RLS）
export const supabaseAdmin = serviceRole
  ? createClient(url, serviceRole)
  : supabase;

export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoRecord {
  id: string;
  prompt: string;
  status: VideoStatus;
  video_url: string | null;
  script: string | null;
  error_msg: string | null;
  paid: boolean;
  created_at: string;
}
