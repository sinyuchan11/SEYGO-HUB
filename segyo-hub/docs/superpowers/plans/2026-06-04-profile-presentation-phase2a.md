# Profile Presentation (Phase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Segyo Hub a real profile experience — cover/avatar/bio/tagline/interests + post & like stats — on an editable `/me` and a public `/u/[nickname]`, built on the Phase 1 design system.

**Architecture:** Two SQL migrations (profile columns + a `security definer` stats RPC; a Storage bucket with path-prefix ownership). Presentational profile components in `components/profile/` reuse Phase 1 primitives (`Card`, `Avatar`, `Badge`, `Tabs`, `Dialog`, `Button`, `Input`). Both routes render a shared async `ProfileView`. Editing is a client `Dialog` that uploads images directly to Storage and commits text via a Server Action.

**Tech Stack:** Next.js 16.2.6, React 19, Tailwind 4, Supabase (Postgres + Storage), vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-04-profile-presentation-phase2a-design.md`

**Next.js 16 note (per AGENTS.md):** before writing the dynamic route (`/u/[nickname]`) or Server Action, consult `node_modules/next/dist/docs/`. Confirmed patterns from this codebase: route `params` is a `Promise` (`await params`); server client is `await createClient()` from `@/lib/supabase/server`; browser client is `createClient()` from `@/lib/supabase/client`.

---

## File Structure

**Create:**
- `supabase/migrations/0007_profiles_phase2.sql` — profile columns + constraints + `get_profile_with_stats` RPC
- `supabase/migrations/0008_profile_storage.sql` — `profile-images` bucket + RLS policies
- `lib/profile.ts` + `lib/profile.test.ts` — `ProfileWithStats` type, `normalizeInterests`, length validators, `coerceProfile`
- `components/profile/ProfileStats.tsx` + `.test.tsx`
- `components/profile/InterestsInput.tsx` + `.test.tsx`
- `components/profile/ProfileAbout.tsx`
- `components/profile/ProfileHeader.tsx`
- `components/profile/ProfilePosts.tsx`
- `components/profile/ProfileView.tsx`
- `components/profile/EditProfileDialog.tsx`
- `app/(app)/me/actions.ts` — `updateProfile` Server Action
- `app/(app)/u/[nickname]/page.tsx` — public profile route

**Modify:**
- `app/(app)/me/page.tsx` — rewrite to use `ProfileView` + edit modal + self-only email/role block
- `components/post/PostDetail.tsx` — author name → `/u/[nickname]` link; convert root `<main>` to `<div>`

**Migration caveat:** the implementer cannot apply migrations (no Supabase credentials locally, and the app is env-tolerant). For migration tasks, verification = careful SQL self-review against existing `supabase/migrations/*` plus `npm run build` still green (build does not touch SQL). The user applies migrations in Supabase, consistent with `docs/supabase-setup-guide.md`.

---

## Task 1: Migration — profile columns + stats RPC

**Files:**
- Create: `supabase/migrations/0007_profiles_phase2.sql`

- [ ] **Step 1: Write the migration**

`supabase/migrations/0007_profiles_phase2.sql`:
```sql
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
```

- [ ] **Step 2: Self-review the SQL**

Verify against existing migrations:
- `profiles` columns added with `if not exists` (idempotent like `0001`).
- Constraints wrapped in `do $$ ... exception when duplicate_object` (idempotent re-run safe).
- RPC reuses `public.current_user_role()` (defined in `0006`) — not an inline `select role from profiles`.
- `posts.id` is `bigserial` and `reactions.target_id` is `bigint` → the join `po.id = r.target_id` is type-correct.
- `#variable_conflict use_column` placed immediately after `as $$`, before `begin`.

- [ ] **Step 3: Confirm build is unaffected**

Run: `npm run build`
Expected: success (SQL files are not part of the build).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_profiles_phase2.sql
git commit -m "feat(db): profile columns + get_profile_with_stats RPC"
```

---

## Task 2: Migration — Storage bucket + policies

**Files:**
- Create: `supabase/migrations/0008_profile_storage.sql`

- [ ] **Step 1: Write the migration**

`supabase/migrations/0008_profile_storage.sql`:
```sql
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
  );
```

- [ ] **Step 2: Self-review the SQL**

- Bucket insert is idempotent (`on conflict do nothing`).
- Policies use `drop policy if exists` then `create` (idempotent, matches `0001`–`0006` style).
- `(storage.foldername(name))[1]` extracts the first path segment (`{user_id}`) and compares to `auth.uid()::text`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0008_profile_storage.sql
git commit -m "feat(db): profile-images storage bucket and RLS policies"
```

---

## Task 3: Profile helper lib (TDD)

**Files:**
- Test: `lib/profile.test.ts`
- Create: `lib/profile.ts`

- [ ] **Step 1: Write the failing test**

`lib/profile.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  normalizeInterests, isValidBio, isValidTagline, coerceProfile,
  MAX_INTERESTS,
} from './profile'

describe('normalizeInterests', () => {
  it('trims and drops empty entries', () => {
    expect(normalizeInterests([' 게임 ', '  ', '음악'])).toEqual(['게임', '음악'])
  })
  it('dedupes', () => {
    expect(normalizeInterests(['게임', '게임'])).toEqual(['게임'])
  })
  it('caps at MAX_INTERESTS', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(normalizeInterests(many)).toHaveLength(MAX_INTERESTS)
  })
  it('truncates each tag to 20 chars', () => {
    const long = 'x'.repeat(30)
    expect(normalizeInterests([long])[0]).toHaveLength(20)
  })
})

describe('length validators', () => {
  it('isValidBio accepts <=500 and null', () => {
    expect(isValidBio(null)).toBe(true)
    expect(isValidBio('x'.repeat(500))).toBe(true)
    expect(isValidBio('x'.repeat(501))).toBe(false)
  })
  it('isValidTagline accepts <=80', () => {
    expect(isValidTagline('x'.repeat(80))).toBe(true)
    expect(isValidTagline('x'.repeat(81))).toBe(false)
  })
})

describe('coerceProfile', () => {
  it('numbers the bigint stats and defaults interests', () => {
    const p = coerceProfile({ id: 'u1', post_count: '3', likes_received: '7', interests: null })
    expect(p.post_count).toBe(3)
    expect(p.likes_received).toBe(7)
    expect(p.interests).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/profile.test.ts`
Expected: FAIL — cannot resolve `./profile`.

- [ ] **Step 3: Implement the helper**

`lib/profile.ts`:
```ts
export const MAX_INTERESTS = 5
export const MAX_INTEREST_LEN = 20
export const MAX_BIO_LEN = 500
export const MAX_TAGLINE_LEN = 80

export type ProfileWithStats = {
  id: string
  nickname: string | null
  role: string
  grade_class: string | null
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  tagline: string | null
  interests: string[]
  created_at: string
  post_count: number
  likes_received: number
}

/** Trim, drop empties, truncate each to MAX_INTEREST_LEN, dedupe, cap to MAX_INTERESTS. */
export function normalizeInterests(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = item.trim().slice(0, MAX_INTEREST_LEN)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
    if (out.length >= MAX_INTERESTS) break
  }
  return out
}

export function isValidBio(s: string | null): boolean {
  return s === null || s.length <= MAX_BIO_LEN
}

export function isValidTagline(s: string | null): boolean {
  return s === null || s.length <= MAX_TAGLINE_LEN
}

/** Coerce a raw RPC row (bigint stats arrive as strings/numbers) into ProfileWithStats. */
export function coerceProfile(row: Record<string, unknown>): ProfileWithStats {
  return {
    ...(row as ProfileWithStats),
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    post_count: Number(row.post_count ?? 0),
    likes_received: Number(row.likes_received ?? 0),
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/profile.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/profile.ts lib/profile.test.ts
git commit -m "feat(profile): add profile helpers (interests, validators, coerce)"
```

---

## Task 4: ProfileStats component (TDD)

**Files:**
- Test: `components/profile/ProfileStats.test.tsx`
- Create: `components/profile/ProfileStats.tsx`

- [ ] **Step 1: Write the failing test**

`components/profile/ProfileStats.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProfileStats } from './ProfileStats'

describe('ProfileStats', () => {
  it('renders post count and likes received', () => {
    render(<ProfileStats postCount={5} likesReceived={12} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('게시글')).toBeInTheDocument()
    expect(screen.getByText('받은 좋아요')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/profile/ProfileStats.test.tsx`
Expected: FAIL — cannot resolve `./ProfileStats`.

- [ ] **Step 3: Implement**

`components/profile/ProfileStats.tsx`:
```tsx
import { cn } from '@/lib/cn'

export function ProfileStats({
  postCount,
  likesReceived,
  className,
}: {
  postCount: number
  likesReceived: number
  className?: string
}) {
  return (
    <dl className={cn('flex gap-6', className)}>
      <div className="text-center">
        <dd className="text-lg font-bold text-foreground">{postCount}</dd>
        <dt className="text-xs text-muted-fg">게시글</dt>
      </div>
      <div className="text-center">
        <dd className="text-lg font-bold text-foreground">{likesReceived}</dd>
        <dt className="text-xs text-muted-fg">받은 좋아요</dt>
      </div>
    </dl>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/profile/ProfileStats.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/profile/ProfileStats.tsx components/profile/ProfileStats.test.tsx
git commit -m "feat(profile): add ProfileStats component"
```

---

## Task 5: InterestsInput component (TDD)

**Files:**
- Test: `components/profile/InterestsInput.test.tsx`
- Create: `components/profile/InterestsInput.tsx`

- [ ] **Step 1: Write the failing test**

`components/profile/InterestsInput.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InterestsInput } from './InterestsInput'

describe('InterestsInput', () => {
  it('adds a trimmed tag on Enter', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={[]} onChange={onChange} />)
    const input = screen.getByPlaceholderText('관심사 입력 후 Enter')
    fireEvent.change(input, { target: { value: ' 게임 ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['게임'])
  })

  it('removes a tag when its × is clicked', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={['게임', '음악']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('게임 제거'))
    expect(onChange).toHaveBeenCalledWith(['음악'])
  })

  it('disables the input at the max', () => {
    const onChange = vi.fn()
    render(<InterestsInput value={['a', 'b', 'c', 'd', 'e']} onChange={onChange} />)
    expect(screen.getByPlaceholderText('최대 5개')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/profile/InterestsInput.test.tsx`
Expected: FAIL — cannot resolve `./InterestsInput`.

- [ ] **Step 3: Implement**

`components/profile/InterestsInput.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { normalizeInterests, MAX_INTERESTS } from '@/lib/profile'

export function InterestsInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const full = value.length >= MAX_INTERESTS

  function add() {
    if (!draft.trim()) return
    onChange(normalizeInterests([...value, draft]))
    setDraft('')
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} tone="primary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`${tag} 제거`}
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="leading-none"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
      <input
        value={draft}
        disabled={full}
        placeholder={full ? '최대 5개' : '관심사 입력 후 Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-fg disabled:opacity-50"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/profile/InterestsInput.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/profile/InterestsInput.tsx components/profile/InterestsInput.test.tsx
git commit -m "feat(profile): add InterestsInput chip component"
```

---

## Task 6: ProfileAbout component

**Files:**
- Create: `components/profile/ProfileAbout.tsx`

- [ ] **Step 1: Implement**

`components/profile/ProfileAbout.tsx`:
```tsx
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ProfileWithStats } from '@/lib/profile'

export function ProfileAbout({ profile }: { profile: ProfileWithStats }) {
  const joined = new Date(profile.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })
  return (
    <Card className="space-y-4 p-4">
      {profile.bio ? (
        <p className="whitespace-pre-wrap text-sm text-foreground">{profile.bio}</p>
      ) : (
        <p className="text-sm text-muted-fg">소개가 아직 없어요.</p>
      )}
      {profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.interests.map((tag) => (
            <Badge key={tag} tone="primary">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-fg">{joined} 가입</p>
    </Card>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileAbout.tsx
git commit -m "feat(profile): add ProfileAbout component"
```

---

## Task 7: ProfileHeader component

**Files:**
- Create: `components/profile/ProfileHeader.tsx`

- [ ] **Step 1: Implement**

`components/profile/ProfileHeader.tsx`:
```tsx
import { Avatar } from '@/components/ui/Avatar'
import { ProfileStats } from './ProfileStats'
import type { ProfileWithStats } from '@/lib/profile'

export function ProfileHeader({
  profile,
  actionSlot,
}: {
  profile: ProfileWithStats
  actionSlot?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className="h-32 bg-primary-100"
        style={
          profile.cover_url
            ? {
                backgroundImage: `url(${profile.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      />
      <div className="px-4 pb-4">
        <div className="-mt-8 flex items-end justify-between">
          <Avatar
            name={profile.nickname ?? '?'}
            src={profile.avatar_url}
            size={64}
            className="ring-4 ring-surface"
          />
          {actionSlot}
        </div>
        <div className="mt-2">
          <h1 className="text-lg font-bold text-foreground">
            {profile.nickname ?? '이름 없음'}
          </h1>
          {profile.tagline && <p className="text-sm text-muted-fg">{profile.tagline}</p>}
        </div>
        <ProfileStats
          postCount={profile.post_count}
          likesReceived={profile.likes_received}
          className="mt-3"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileHeader.tsx
git commit -m "feat(profile): add ProfileHeader component"
```

---

## Task 8: ProfilePosts + ProfileView

**Files:**
- Create: `components/profile/ProfilePosts.tsx`
- Create: `components/profile/ProfileView.tsx`

- [ ] **Step 1: Implement ProfilePosts**

`components/profile/ProfilePosts.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'

export async function ProfilePosts({
  authorId,
  authorNickname,
}: {
  authorId: string
  authorNickname: string | null
}) {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .eq('author_id', authorId)
    .eq('is_anonymous', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const ids = (posts ?? []).map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids.length ? ids : [-1]).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids.length ? ids : [-1]),
  ])

  const count = (
    arr: { post_id?: number; target_id?: number }[] | null,
    id: number,
    key: 'post_id' | 'target_id',
  ) => (arr ?? []).filter((r) => r[key] === id).length

  if ((posts ?? []).length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-fg">아직 쓴 글이 없어요.</p>
  }

  return (
    <ul>
      {(posts ?? []).map((p) => (
        <li key={p.id}>
          <PostListItem
            id={p.id}
            title={p.title}
            authorNickname={authorNickname}
            isAnonymous={false}
            createdAt={p.created_at}
            commentCount={count(comments, p.id, 'post_id')}
            likeCount={count(likes, p.id, 'target_id')}
          />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Implement ProfileView**

`components/profile/ProfileView.tsx`:
```tsx
import { ProfileHeader } from './ProfileHeader'
import { ProfileAbout } from './ProfileAbout'
import { ProfilePosts } from './ProfilePosts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import type { ProfileWithStats } from '@/lib/profile'

export function ProfileView({
  profile,
  actionSlot,
}: {
  profile: ProfileWithStats
  actionSlot?: React.ReactNode
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      <ProfileHeader profile={profile} actionSlot={actionSlot} />
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">소개</TabsTrigger>
          <TabsTrigger value="posts">쓴 글</TabsTrigger>
        </TabsList>
        <TabsContent value="about" className="pt-3">
          <ProfileAbout profile={profile} />
        </TabsContent>
        <TabsContent value="posts" className="pt-3">
          <ProfilePosts authorId={profile.id} authorNickname={profile.nickname} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

Note: `Tabs`/`TabsContent` are Phase 1 client components; `ProfilePosts` is an async server component passed as their child. Next.js renders the server child to the RSC payload and passes it through the client boundary — this composition is valid.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add components/profile/ProfilePosts.tsx components/profile/ProfileView.tsx
git commit -m "feat(profile): add ProfilePosts and ProfileView composition"
```

---

## Task 9: updateProfile Server Action

**Files:**
- Create: `app/(app)/me/actions.ts`

- [ ] **Step 1: Implement**

`app/(app)/me/actions.ts`:
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeInterests, isValidBio, isValidTagline } from '@/lib/profile'

export async function updateProfile(input: {
  tagline: string | null
  bio: string | null
  interests: string[]
  avatar_url?: string | null
  cover_url?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')

  const tagline = input.tagline?.trim() || null
  const bio = input.bio?.trim() || null
  if (!isValidTagline(tagline) || !isValidBio(bio)) throw new Error('invalid length')
  const interests = normalizeInterests(input.interests)

  const patch: Record<string, unknown> = { tagline, bio, interests }
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/me')
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/me/actions.ts"
git commit -m "feat(profile): add updateProfile server action"
```

---

## Task 10: EditProfileDialog

**Files:**
- Create: `components/profile/EditProfileDialog.tsx`

- [ ] **Step 1: Implement**

`components/profile/EditProfileDialog.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InterestsInput } from './InterestsInput'
import { updateProfile } from '@/app/(app)/me/actions'
import { MAX_BIO_LEN, MAX_TAGLINE_LEN, type ProfileWithStats } from '@/lib/profile'

export function EditProfileDialog({ profile }: { profile: ProfileWithStats }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tagline, setTagline] = useState(profile.tagline ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [interests, setInterests] = useState<string[]>(profile.interests)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.cover_url)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function upload(kind: 'avatar' | 'cover', file: File) {
    setError(null)
    const maxMb = kind === 'avatar' ? 2 : 5
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있어요.')
      return
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`${maxMb}MB 이하 이미지만 가능해요.`)
      return
    }
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('로그인이 필요해요.')
      return
    }
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${user.id}/${kind}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: true })
    if (upErr) {
      setError('업로드 실패: ' + upErr.message)
      return
    }
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path)
    const url = `${data.publicUrl}?v=${Date.now()}`
    if (kind === 'avatar') setAvatarUrl(url)
    else setCoverUrl(url)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        tagline: tagline || null,
        bio: bio || null,
        interests,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      })
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        프로필 편집
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-base font-bold text-foreground">프로필 편집</DialogTitle>
        <div className="mt-4 space-y-4">
          <label className="block text-sm text-foreground">
            커버 이미지
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && upload('cover', e.target.files[0])}
              className="mt-1 block w-full text-xs"
            />
          </label>
          <label className="block text-sm text-foreground">
            아바타
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && upload('avatar', e.target.files[0])}
              className="mt-1 block w-full text-xs"
            />
          </label>
          <label className="block text-sm text-foreground">
            한 줄 소개
            <Input
              value={tagline}
              maxLength={MAX_TAGLINE_LEN}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="block text-sm text-foreground">
            자기소개
            <textarea
              value={bio}
              maxLength={MAX_BIO_LEN}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <div className="text-sm text-foreground">
            관심사
            <div className="mt-1">
              <InterestsInput value={interests} onChange={setInterests} />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

Note: the trigger is a plain `Button` with `onClick={() => setOpen(true)}` and the `Dialog` is controlled via `open`/`onOpenChange` — this avoids `DialogTrigger asChild`, which would pass a ref into the non-`forwardRef` Phase 1 `Button`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success. (Server Action imported into a client component is valid in Next.js App Router.)

- [ ] **Step 3: Commit**

```bash
git add components/profile/EditProfileDialog.tsx
git commit -m "feat(profile): add EditProfileDialog with image upload"
```

---

## Task 11: Rewrite /me page

**Files:**
- Modify: `app/(app)/me/page.tsx` (full replace)

- [ ] **Step 1: Replace the page**

`app/(app)/me/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileView } from '@/components/profile/ProfileView'
import { EditProfileDialog } from '@/components/profile/EditProfileDialog'
import { Button } from '@/components/ui/Button'
import { coerceProfile } from '@/lib/profile'

export default async function MePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase.rpc('get_profile_with_stats', { target_id: user.id })
  if (!rows?.[0]) redirect('/onboarding')
  const profile = coerceProfile(rows[0])

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const showAdmin = profile.role === 'admin' || profile.role === 'moderator'

  return (
    <div>
      <ProfileView profile={profile} actionSlot={<EditProfileDialog profile={profile} />} />
      <div className="space-y-2 px-4 pb-6 text-sm">
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-fg">이메일</span>
          <span className="text-foreground">{user.email}</span>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-fg">권한</span>
          <span className="text-foreground">{profile.role}</span>
        </div>
        {showAdmin && (
          <Link href="/admin/users" className="block pt-2">
            <Button variant="secondary" className="w-full">
              관리자 페이지
            </Button>
          </Link>
        )}
        <form action={logout}>
          <Button variant="ghost" className="w-full text-danger">
            로그아웃
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/me/page.tsx"
git commit -m "feat(profile): rewrite /me with new profile view and edit"
```

---

## Task 12: Public profile route /u/[nickname]

**Files:**
- Create: `app/(app)/u/[nickname]/page.tsx`

- [ ] **Step 1: Implement**

`app/(app)/u/[nickname]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from '@/components/profile/ProfileView'
import { coerceProfile } from '@/lib/profile'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>
}) {
  const { nickname } = await params
  const decoded = decodeURIComponent(nickname)
  const supabase = await createClient()

  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', decoded)
    .single()
  if (!target) notFound()

  const { data: rows, error } = await supabase.rpc('get_profile_with_stats', {
    target_id: target.id,
  })
  if (error || !rows?.[0]) notFound()
  const profile = coerceProfile(rows[0])

  return <ProfileView profile={profile} />
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success; route `/u/[nickname]` appears in the build output.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/u/[nickname]/page.tsx"
git commit -m "feat(profile): add public /u/[nickname] route"
```

---

## Task 13: PostDetail author link + main fix

**Files:**
- Modify: `components/post/PostDetail.tsx`

- [ ] **Step 1: Add the Link import**

At the top of `components/post/PostDetail.tsx`, add after the existing imports:
```tsx
import Link from 'next/link'
```

- [ ] **Step 2: Convert the root `<main>` to `<div>`**

In `components/post/PostDetail.tsx`, the component returns `<main> … </main>`. Change the opening `<main>` (around line 65) to `<div>` and the matching closing `</main>` (the last tag before the final `)`, around line 137) to `</div>`. This removes a nested `<main>` inside the AppShell's `<main>` (Phase 1's nested-main cleanup only swept `app/`, missing this component).

- [ ] **Step 3: Make the author name a profile link**

Replace the author span (around line 69):
```tsx
          <span>{data.isAnonymous ? '익명' : (data.authorNickname ?? '?')}</span>
```
with:
```tsx
          <span>
            {data.isAnonymous ? (
              '익명'
            ) : data.authorNickname ? (
              <Link
                href={`/u/${encodeURIComponent(data.authorNickname)}`}
                className="hover:underline"
              >
                {data.authorNickname}
              </Link>
            ) : (
              '?'
            )}
          </span>
```

The link is valid here because `PostDetail` is not wrapped in an outer `<Link>` (unlike `PostListItem` board rows). Anonymous posts and null-nickname posts render plain text, no link.

- [ ] **Step 4: Verify build and tests**

Run: `npm run build`
Expected: success.
Run: `npm run test`
Expected: all tests pass (existing 19 + profile 7 + ProfileStats 1 + InterestsInput 3 = 30).

- [ ] **Step 5: Commit**

```bash
git add components/post/PostDetail.tsx
git commit -m "feat(post): link author to public profile; fix nested main"
```

---

## Final Verification (after all tasks)

- [ ] `npm run test` → all tests pass (30 total).
- [ ] `npm run build` → success; routes include `/me` and `/u/[nickname]`.
- [ ] `npm run lint` → no NEW errors beyond the 10 pre-existing repo errors (no-explicit-any in data pages, set-state-in-effect in NotificationBell). New profile code should be lint-clean.
- [ ] Manual (requires Supabase with migrations `0007`+`0008` applied): `/me` renders header/stats/about/posts; edit modal uploads avatar/cover, saves tagline/bio/interests; `/u/[nickname]` shows public read-only profile; unknown nickname → 404; post-detail author links to `/u/[nickname]`.

---

## Self-Review Notes

- **Spec coverage:** data model + RPC (Task 1), Storage (Task 2), profile helper (Task 3), stats display (Tasks 4/7), interests input (Task 5), about (Task 6), posts list + tabs (Task 8), edit modal + action (Tasks 9/10), `/me` (Task 11), `/u/[nickname]` (Task 12), public-profile entry point + nested-main fix (Task 13), testing + DoD (Final Verification). Deferred items (follow, badges, comment-likes, board-row author links) are correctly absent.
- **Type consistency:** `ProfileWithStats` defined in Task 3 is the single shape used by all components and pages; `coerceProfile` (Task 3) is used by both pages (Tasks 11/12); `normalizeInterests` is shared by `InterestsInput` (Task 5) and the Server Action (Task 9). `ProfilePosts` signature `{ authorId, authorNickname }` (Task 8) matches its only caller `ProfileView` (Task 8).
- **Known acceptances:** migrations can't be auto-applied/tested locally (env-tolerant repo) — verification is SQL self-review + the user applies them; the `board='anon'` theoretical leak is moot since `PostForm` only creates `board:'free'` non-anonymous posts (filter `is_anonymous=false` is sufficient defense).
