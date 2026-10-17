-- شغّل هذا الملف مرة واحدة في Supabase > SQL Editor.
-- لا تضع service_role key في ملفات المتصفح. دوال Netlify فقط تستخدمه.
create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(nickname) between 2 and 24),
  token_hash text not null unique,
  banner_id text not null default 'basic'
    check (banner_id in ('basic','team-red','team-elite','team-gold')),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- لا تضف سياسات عامة للقراءة أو التعديل.
-- الوصول إلى الجدول يتم من خلال Netlify Function باستخدام service role key
-- المحفوظة كمتغير بيئة، وليس من المتصفح.
revoke all on table public.members from anon, authenticated;
