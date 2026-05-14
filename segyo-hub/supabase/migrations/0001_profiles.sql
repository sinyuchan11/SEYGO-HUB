-- Role enum (idempotent: ignore if already exists)
do $$ begin
  create type user_role as enum ('pending', 'member', 'moderator', 'admin', 'banned');
exception when duplicate_object then null;
end $$;

-- Profile table (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique,
  role user_role not null default 'pending',
  grade_class text,
  timeout_until timestamptz,
  agreed_to_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- 본인 row 읽기
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

-- 멤버 이상은 다른 멤버의 닉네임/role 조회 가능 (작성자 표시용)
drop policy if exists "profiles_member_select" on public.profiles;
create policy "profiles_member_select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 본인 닉네임/학년반 수정 (role/timeout은 X)
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- role/timeout_until 변경은 별도 정책으로만 허용
    and role = (select role from public.profiles where id = auth.uid())
    and timeout_until is not distinct from (select timeout_until from public.profiles where id = auth.uid())
  );

-- 관리자만 role/timeout 변경 가능 (별도 RPC로 처리)
-- (RLS만으로는 컬럼 단위 제어가 까다로워서 RPC 함수로 위임)
create or replace function public.admin_set_role(target_id uuid, new_role user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role <> 'admin' then
    raise exception 'forbidden: admin only';
  end if;
  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke all on function public.admin_set_role(uuid, user_role) from public;
grant execute on function public.admin_set_role(uuid, user_role) to authenticated;

-- 모더 이상이 타임아웃 설정
create or replace function public.mod_set_timeout(target_id uuid, until timestamptz)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('moderator', 'admin') then
    raise exception 'forbidden: moderator or admin only';
  end if;
  update public.profiles set timeout_until = until where id = target_id;
end;
$$;

revoke all on function public.mod_set_timeout(uuid, timestamptz) from public;
grant execute on function public.mod_set_timeout(uuid, timestamptz) to authenticated;
