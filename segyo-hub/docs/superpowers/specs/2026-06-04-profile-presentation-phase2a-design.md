# Profile Presentation (Phase 2a) — Spec

**Date:** 2026-06-04
**Phase:** 2a (first slice of Phase 2 "profile domain")
**Status:** Approved for plan
**Builds on:** Phase 1 design system (`docs/superpowers/specs/2026-05-21-design-system-phase1-design.md`)

## Goal

Turn the bare `/me` key-value page into a real profile experience — cover image, avatar, bio/tagline/interests, joined date, and post/like stats — and add a public profile route `/u/[nickname]` so members can view each other. Built entirely on the Phase 1 design system.

## Scope decomposition

Phase 2 ("profile domain") was split. This spec is **2a — profile presentation only**. Deferred to later slices:
- **Follow/following system** (and therefore follower counts) — next slice
- **Badges/achievements** — later slice
- Comment-likes in the "likes received" stat — later (only post-likes counted here)
- Board-list author → profile links — later (requires PostListItem row restructure; see Risks)

## Decisions

| Decision | Value |
|---|---|
| Profile reach | Own profile `/me` (editable) + public `/u/[nickname]` (read-only) |
| Images | Supabase Storage uploads (avatar + cover) |
| Stats | post count + post-likes received, aggregated from existing data (NO follower count) |
| About fields | bio, tagline, interests (free-form, capped), joined date (from `created_at`) |
| Interests input | free-form, max 5 tags, each trimmed/deduped/≤20 chars |
| Edit UX | modal (Phase 1 `Dialog`) with in-modal image upload |
| Posts list | "쓴 글" tab via Phase 1 `Tabs`, reusing `PostListItem` (excludes anonymous) |
| Stats access | Approach C — a `security definer` RPC returning profile + computed stats |

## Architecture

### 1. Data model — migration `0007_profiles_phase2.sql`

```sql
alter table public.profiles
  add column if not exists avatar_url  text,
  add column if not exists cover_url   text,
  add column if not exists bio         text,
  add column if not exists tagline     text,
  add column if not exists interests   text[] not null default '{}';

alter table public.profiles
  add constraint profiles_bio_len      check (bio is null or char_length(bio) <= 500),
  add constraint profiles_tagline_len  check (tagline is null or char_length(tagline) <= 80),
  add constraint profiles_interests_len
    check (array_length(interests, 1) is null or array_length(interests, 1) <= 5);
```

- `interests` is `text[]` (free-form, ≤5). Per-tag length (≤20 chars) enforced app-side; DB guards count only.
- Existing `profiles_self_update` RLS (from `0006`) guards only `role` and `timeout_until` immutability, so the new columns are freely self-editable — **no new policy needed.**

### 2. Stats access — RPC (Approach C), in `0007_profiles_phase2.sql`

```sql
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
begin
  -- Access control: self, or member+ (matches existing RLS philosophy).
  -- Reuse the 0006 helper rather than re-querying profiles inline.
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
```

**Design points:**
- `security definer` bypasses underlying RLS, so access control is enforced **explicitly inside** the function — this is the deliberate alternative to a plain view (which would silently bypass RLS) or a `security_invoker` view (which couldn't centralize the nickname-routing + access logic as cleanly).
- Reuses the existing `current_user_role()` helper from `0006` (not an inline `select role from profiles`) to match the codebase's recursion-safe pattern.
- `post_count`: non-anonymous, non-deleted posts (matches the "쓴 글" tab definition).
- `likes_received`: reactions on the user's posts only. Comment-likes excluded (deferred).
- `/u/[nickname]`: resolve nickname → id first (allowed by `profiles_member_select` RLS), then call the RPC with the id. `notFound()` if nickname missing/unknown.

### 3. Storage — migration `0008_profile_storage.sql`

Single public bucket `profile-images`, ownership by path prefix:
```
profile-images/{user_id}/avatar.{ext}
profile-images/{user_id}/cover.{ext}
```

```sql
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy "profile_images_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-images');

create policy "profile_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Upload flow (client → Storage → profiles):**
1. Edit modal: user selects a file.
2. Client `supabase-js` uploads to `profile-images/{uid}/avatar.{ext}` with `upsert: true`.
3. `getPublicUrl()` → public URL.
4. URL committed to `profiles.avatar_url` / `cover_url` when the user clicks Save.

- Client-side validation: `image/*` type, size caps (avatar 2MB, cover 5MB), checked before upload.
- Fixed paths + `upsert: true` → no orphan accumulation.
- Cache-busting: append `?v={timestamp}` to the stored URL so updates show immediately.
- Uploads run in the client edit modal via `lib/supabase/client.ts` (browser client, env-safe — module load never throws on missing keys; only the network upload fails if unconfigured).

### 4. Routes & components

**Routes:**
- `/me` — own profile. Server component loads self via `get_profile_with_stats(user.id)`. Shows edit/logout/admin actions.
- `/u/[nickname]` — public profile. Resolve nickname → id, then RPC. Read-only.

**`components/profile/`:**

| Component | Responsibility | Built on |
|---|---|---|
| `ProfileHeader` | cover banner + floating avatar + name/tagline + `ProfileStats` + `actionSlot` | `Card`, `Avatar` |
| `ProfileStats` | post count · likes received, horizontal | — |
| `ProfileAbout` | bio · interests tags · joined date | `Card`, `Badge` |
| `ProfileTabs` | "소개 / 쓴 글" tab switch | `Tabs` |
| `ProfilePosts` | author's posts list (excludes anonymous) | reuses `PostListItem` |
| `EditProfileDialog` | edit modal (client) | `Dialog` |

**Page composition (both routes):**
```
<ProfileHeader profile={data} actionSlot={...} />
<ProfileTabs>
  소개  → <ProfileAbout profile={data} />
  쓴 글 → <ProfilePosts authorId={data.id} />
```
- `/me`: `actionSlot` = "프로필 편집" (modal trigger) + logout + admin link (if moderator/admin). Email and role are shown in a small self-only read-only block rendered by `/me` directly below `ProfileHeader` (not inside the edit modal, since they are not editable here).
- `/u/[nickname]`: `actionSlot` = empty (follow button is a later slice).

**Public-profile entry point:** the author name on the **post detail page** (`PostDetail`) links to `/u/[nickname]` when the post is not anonymous and the nickname exists. NOT from `PostListItem` board rows — those rows are a single full-row `<Link>` to the post, and nesting an author `<a>` inside would be invalid HTML. Board-row author links are deferred to a later slice that restructures the row.

### 5. Edit modal (`EditProfileDialog`)

Fields: cover image, avatar image, tagline (≤80, counter), bio (≤500, counter), interests (chip input: Enter adds, X removes, disabled at 5; each tag trimmed/deduped/≤20 chars).

- Images upload immediately to Storage on selection (preview updates); the URL is committed to `profiles` only on Save.
- Text commit via a Server Action `updateProfile` in `app/(app)/me/actions.ts`:
```ts
'use server'
export async function updateProfile(input: {
  tagline: string | null; bio: string | null; interests: string[];
  avatar_url?: string | null; cover_url?: string | null;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  // re-validate lengths/counts server-side, then:
  await supabase.from('profiles').update({ /* sanitized input */ }).eq('id', user.id)
  revalidatePath('/me')
}
```
- Division of labor: images = client (direct Storage), text fields = Server Action. RLS `profiles_self_update` guarantees role/timeout stay immutable.
- Validation both client (UX) and DB constraint (defense); the Server Action re-validates lengths/counts before the update.
- On success: close modal + `revalidatePath('/me')`.
- Errors: upload failure (network / unconfigured Storage) → inline error in modal; text save still works. Text editing works even with Storage unconfigured (env-tolerant).

### 6. Shared profile helper — `lib/profile.ts`

Pure functions (unit-tested): `normalizeInterests(raw: string[]): string[]` (trim, drop empties, dedupe, cap 5, each ≤20 chars), and length validators for bio/tagline. Used by both the edit modal (client) and the Server Action (server).

## Testing

**Unit (vitest):**
- `lib/profile.ts` — `normalizeInterests` (trim/dedupe/cap/length), bio/tagline length validators. Pure functions, TDD.
- `ProfileStats` — renders post_count/likes_received props correctly.
- Interests chip add/remove logic.

**Migration / DB checks (manual, in Supabase SQL editor):**
- Apply `0007` then `0008` in order, no errors.
- `get_profile_with_stats`: (1) self id succeeds, (2) another member succeeds, (3) pending/anon raises forbidden, (4) post_count and likes_received are correct.
- Storage RLS: uploading to another user's path prefix is rejected.

**Manual E2E (dev server, 360/800/1440 widths):**
1. `/me` — header/stats/about/tabs render; "프로필 편집" opens modal.
2. Edit modal — upload avatar/cover, enter tagline/bio/interests, Save → reflected.
3. `/u/[nickname]` — public view, no edit button, "쓴 글" tab excludes anonymous posts.
4. Unknown nickname → 404.
5. Post detail author (non-anonymous) → links to `/u/[nickname]`.

### Definition of Done

1. `/me` and `/u/[nickname]` both render in the new design across mobile/tablet/desktop without breakage.
2. Profile editing (text + images) saves and reflects.
3. Stats (post count, post-likes received) display correctly.
4. RPC and Storage RLS enforce access control (unauthorized access rejected).
5. `npm run build` and `npm run test` green; existing 19 tests have no regressions.
6. With Supabase/Storage env keys absent, build and page loads do not break (only live uploads/queries fail).

## Risks

- **PostListItem author links:** deferred (nested-anchor invalidity). Entry point to public profiles in 2a is the post-detail author only. If board-row author links are wanted later, the row must be restructured so the author isn't nested inside the post `<Link>`.
- **`nickname` null:** pre-onboarding users may have null nickname. Guard `/u/[nickname]` routing and the post-detail author link against null (no link, or 404).
- **`board = 'anon'`:** the schema has an `anon` board enum value in addition to the `is_anonymous` flag. The post list/count exclude `is_anonymous = true`; if anon-board posts don't set that flag, they could leak into a profile. Confirm during implementation whether anon-board posts set `is_anonymous`; if not, also exclude `board = 'anon'`.
- **Next.js 16 specifics (per AGENTS.md):** before writing dynamic-route (`/u/[nickname]`) or Server Action code, read the relevant docs under `node_modules/next/dist/docs/`.
- **Supabase Storage setup:** the migration creates the bucket + policies. On a local env without keys, uploads fail gracefully; everything else works.
- **plpgsql column shadowing in the RPC:** `RETURNS TABLE(id, nickname, created_at, …)` makes those names PL/pgSQL variables that shadow the `profiles` columns of the same name. The body avoids ambiguity by qualifying every column reference as `p.<col>`. Verify the function compiles cleanly when applied; if Postgres still reports an ambiguous reference, add `#variable_conflict use_column` at the top of the function body.
