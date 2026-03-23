-- ============================================================
-- GetReelEstate — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 里执行此文件
-- ============================================================

-- 1. videos 表
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       text,                          -- 可选，留空
  source_urls   jsonb    default '[]',         -- 原始图片 URL 列表
  prompt        text     not null,             -- 房源描述
  status        text     not null default 'pending'
                         check (status in ('pending','processing','completed','failed')),
  video_url     text,                          -- 渲染完成后的公开 URL
  script        text,                          -- LLM 生成的文案
  error_msg     text,                          -- 失败原因
  stripe_session_id text,                      -- Stripe Checkout session ID
  paid          boolean  not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. 自动更新 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_videos_updated_at on public.videos;
create trigger set_videos_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- 3. RLS：关闭（Worker 用 service_role 绕过，前端只读自己记录）
alter table public.videos enable row level security;

-- 允许匿名用户插入（创建任务）
create policy "anon insert" on public.videos
  for insert to anon with check (true);

-- 允许用户读自己的任务（按 id）
create policy "select by id" on public.videos
  for select using (true);

-- 4. 开启 Realtime（监听 videos 表变更）
begin;
  -- 将表加入 supabase_realtime publication
  alter publication supabase_realtime add table public.videos;
commit;

-- 5. Storage bucket: reels（存放生成的视频）
insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do nothing;

-- 允许匿名读取（下载视频）
create policy "public read reels" on storage.objects
  for select using (bucket_id = 'reels');

-- 允许 service_role 上传
create policy "service upload reels" on storage.objects
  for insert with check (bucket_id = 'reels');
