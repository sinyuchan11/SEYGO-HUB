-- Convenience combo of migrations 0007 + 0008 for pasting into the Supabase
-- Dashboard SQL Editor when the CLI is not available.
--
-- Context: the live DB has 0001–0006 applied but NOT 0007/0008, so profile
-- columns (avatar_url, bio, ...), the get_profile_with_stats RPC, and the
-- profile-images storage bucket are missing. Running this enables the profile
-- page, profile/cover image upload, and real avatars in the board feed.
--
-- Safe to run multiple times (idempotent: add column if not exists,
-- on conflict do nothing, drop policy if exists, create or replace function).
-- Prerequisite: 0001–0006 already applied (user_role enum, current_user_role(),
-- posts/reactions tables). Verified present on the live DB.

-- ============================================================
-- 0007: profile presentation columns + stats RPC
-- ============================================================
alter table public.profiles
  add column if not exists avatar_url  text,
  add column if not exists cover_url   text,
  add column if not exists bio         text,
  add column if not exists tagline     text,
  add column if not exists interests   text[] not null default '{}';

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

create or replace function public.get_profile_with_stats(target_id uuid)
returns table (
  id uuid, nickname text, role user_role, grade_class text,
  avatar_url text, cover_url text, bio text, tagline text,
  interests text[], created_at timestamptz,
  post_count bigint, likes_received bigint
)
language plpgsql
stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null
     or (auth.uid() <> target_id
         and public.current_user_role() not in ('member','moderator','admin')) then
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

-- ============================================================
-- 0008: profile image storage (avatar + cover)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

drop policy if exists "profile_images_public_read" on storage.objects;
create policy "profile_images_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-images');

drop policy if exists "profile_images_owner_insert" on storage.objects;
create policy "profile_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_images_owner_update" on storage.objects;
create policy "profile_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
