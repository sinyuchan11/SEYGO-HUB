-- Content reports (posts / comments). Members file reports; staff review them.

do $$ begin
  create type report_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id          bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   bigint not null,
  reason      text not null,
  detail      text,
  status      report_status not null default 'open',
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

-- Members and up can file a report as themselves.
drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert"
  on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and public.current_user_role() in ('member', 'moderator', 'admin')
  );

-- A reporter sees their own; moderators/admins see all.
drop policy if exists "reports_select" on public.reports;
create policy "reports_select"
  on public.reports for select
  using (
    auth.uid() = reporter_id
    or public.current_user_role() in ('moderator', 'admin')
  );

-- Only moderators/admins may change status.
drop policy if exists "reports_mod_update" on public.reports;
create policy "reports_mod_update"
  on public.reports for update
  using (public.current_user_role() in ('moderator', 'admin'))
  with check (public.current_user_role() in ('moderator', 'admin'));
