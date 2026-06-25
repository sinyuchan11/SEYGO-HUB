-- Home "오늘의 정보" cards (meal plan / schedule). Admin-editable content.

create table if not exists public.info_cards (
  key        text primary key,            -- 'meal' | 'schedule'
  title      text not null,
  body       text,                         -- admin-entered content (multiline)
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Seed the two cards (content filled in later by an admin).
insert into public.info_cards (key, title) values
  ('meal', '오늘의 식단'),
  ('schedule', '일정표')
on conflict (key) do nothing;

-- updated_at auto-refresh (reuses the helper from 0001)
drop trigger if exists info_cards_touch_updated_at on public.info_cards;
create trigger info_cards_touch_updated_at
  before update on public.info_cards
  for each row execute function public.touch_updated_at();

alter table public.info_cards enable row level security;

-- Members and up can read.
drop policy if exists "info_cards_read" on public.info_cards;
create policy "info_cards_read"
  on public.info_cards for select
  using (public.current_user_role() in ('member', 'moderator', 'admin'));

-- Only admins may edit.
drop policy if exists "info_cards_admin_update" on public.info_cards;
create policy "info_cards_admin_update"
  on public.info_cards for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
