-- Phase 2a: profile presentation columns + stats RPC

alter table public.profiles
  add column if not exists avatar_url  text,
  add column if not exists cover_url   text,
  add column if not exists bio         text,
  add column if not exists tagline     text,
  add column if not exists interests   text[] not null default '{}';

-- Length/count guards (DB-level defense; app enforces per-tag length)
do $$ begin
  alter table public.profiles
    add constraint profiles_bio_len     check (bio is null or char_length(bio) <= 500);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_tagline_len check (tagline is null or char_length(tagline) <= 80);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_interests_len
      check (array_length(interests, 1) is null or array_length(interests, 1) <= 5);
exception when duplicate_object then null; end $$;

-- Profile + computed stats. SECURITY DEFINER bypasses RLS, so access control
-- is enforced explicitly here, reusing the 0006 recursion-safe helper.
-- #variable_conflict use_column neutralizes RETURNS TABLE column shadowing.
create or replace function public.get_profile_with_stats(target_id uuid)
returns table (
  id uuid, nickname text, role user_role, grade_class text,
  avatar_url text, cover_url text, bio text, tagline text,
  interests text[], created_at timestamptz,
  post_count bigint, likes_received bigint
)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() <> target_id
     and public.current_user_role() not in ('member','moderator','admin') then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id, p.nickname, p.role, p.grade_class,
    p.avatar_url, p.cover_url, p.bio, p.tagline,
    p.interests, p.created_at,
    (select count(*) from public.posts po
       where po.author_id = p.id and po.deleted_at is null and po.is_anonymous = false),
    (select count(*) from public.reactions r
       join public.posts po on po.id = r.target_id
       where r.target_type = 'post'
         and po.author_id = p.id and po.deleted_at is null)
  from public.profiles p
  where p.id = target_id;
end;
$$;

revoke all on function public.get_profile_with_stats(uuid) from public;
grant execute on function public.get_profile_with_stats(uuid) to authenticated;
