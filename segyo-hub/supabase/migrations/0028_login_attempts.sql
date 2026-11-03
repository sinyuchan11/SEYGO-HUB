-- 0028: 로그인 실패 기록 — 15분 안에 5번 틀리면 15분 잠금 (lib/loginLimit.ts).
-- 서버 라우트(/api/auth/login)가 service-role 로만 읽고 쓴다.
-- RLS 를 켜고 정책을 두지 않아 클라이언트 역할로는 아무것도 못 한다.

create table if not exists public.login_failures (
  id         bigint generated always as identity primary key,
  email      text        not null,   -- 소문자·trim 으로 정규화된 값
  ip         text,
  created_at timestamptz not null default now()
);

create index if not exists login_failures_email_created_idx
  on public.login_failures (email, created_at desc);

alter table public.login_failures enable row level security;
revoke all on public.login_failures from anon, authenticated;
