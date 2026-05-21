-- Fix: profiles_member_select 정책이 profiles 자체를 SELECT 하면서
-- 무한 재귀(42P17 infinite recursion detected in policy)를 일으키는 문제 해결.
-- 0001/0002/0003/0004의 다수 정책이 같은 패턴(SELECT FROM profiles WHERE ...)을
-- 쓰고 있어서, RLS 우회용 SECURITY DEFINER 헬퍼 함수로 모두 교체한다.

-- 1) Helper functions (SECURITY DEFINER → RLS 우회, 재귀 차단)

create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

create or replace function public.current_user_timeout_until()
returns timestamptz
language sql stable security definer set search_path = public
as $$
  select timeout_until from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_timeout_until() from public;
grant execute on function public.current_user_timeout_until() to authenticated;

-- 2) profiles 정책 교체

drop policy if exists "profiles_member_select" on public.profiles;
create policy "profiles_member_select"
  on public.profiles for select
  using (public.current_user_role() in ('member', 'moderator', 'admin'));

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.current_user_role()
    and timeout_until is not distinct from public.current_user_timeout_until()
  );

-- 3) posts 정책 교체

drop policy if exists "posts_member_select" on public.posts;
create policy "posts_member_select"
  on public.posts for select
  using (public.current_user_role() in ('member', 'moderator', 'admin'));

drop policy if exists "posts_member_insert" on public.posts;
create policy "posts_member_insert"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and public.current_user_role() in ('member', 'moderator', 'admin')
    and (
      public.current_user_timeout_until() is null
      or public.current_user_timeout_until() <= now()
    )
    and (
      board <> 'notice'
      or public.current_user_role() in ('moderator', 'admin')
    )
  );

drop policy if exists "posts_mod_update" on public.posts;
create policy "posts_mod_update"
  on public.posts for update
  using (public.current_user_role() in ('moderator', 'admin'));

-- 4) comments 정책 교체 (0003 적용 후 존재)

do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'comments') then
    drop policy if exists "comments_member_select" on public.comments;
    create policy "comments_member_select"
      on public.comments for select
      using (public.current_user_role() in ('member', 'moderator', 'admin'));

    drop policy if exists "comments_member_insert" on public.comments;
    create policy "comments_member_insert"
      on public.comments for insert
      with check (
        auth.uid() = author_id
        and public.current_user_role() in ('member', 'moderator', 'admin')
        and (
          public.current_user_timeout_until() is null
          or public.current_user_timeout_until() <= now()
        )
      );

    drop policy if exists "comments_mod_update" on public.comments;
    create policy "comments_mod_update"
      on public.comments for update
      using (public.current_user_role() in ('moderator', 'admin'));
  end if;
end $$;

-- 5) reactions 정책 교체

drop policy if exists "reactions_member_select" on public.reactions;
create policy "reactions_member_select"
  on public.reactions for select
  using (public.current_user_role() in ('member', 'moderator', 'admin'));

drop policy if exists "reactions_self_insert" on public.reactions;
create policy "reactions_self_insert"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and public.current_user_role() in ('member', 'moderator', 'admin')
  );
