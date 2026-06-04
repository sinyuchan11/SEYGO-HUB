-- Phase 2a: profile image storage (avatar + cover)

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

-- Anyone may read (public profiles)
drop policy if exists "profile_images_public_read" on storage.objects;
create policy "profile_images_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-images');

-- Only the owner may write to their own {user_id}/... path
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
