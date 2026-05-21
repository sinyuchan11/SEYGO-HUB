# Segyo Hub — Phase 1 (Foundation) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세교중 친구 5~20명이 가입 → 관리자 승인 → 게시판/댓글/좋아요/알림을 사용할 수 있는 최소 동작 사이트를 무료 인프라(Vercel + Supabase)에 배포한다.

**Architecture:** Next.js 15 App Router 단일 앱이 화면+API를 모두 담당. Supabase가 Auth/Postgres/RLS 담당. 권한은 DB 레벨 RLS와 Next.js middleware로 이중 보호. 모바일 우선 UI(Tailwind).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Vitest (단위 테스트), Vercel (배포).

**스펙 참조:** `docs/superpowers/specs/2026-05-07-segyo-hub-design.md`

**Phase 1 범위 (스펙 §6 Phase 1):**
- 프로젝트 셋업 + 인증 + 동의 체크
- 대기자/승급 흐름
- 게시판(자유) + 글 작성/수정/삭제
- 댓글 + 대댓글
- 좋아요 (글/댓글)
- 사이트 내 알림 (내 글에 댓글 / 내 댓글에 대댓글)
- 관리자 페이지 — 사용자 관리만

**Phase 1 범위 밖 (다음 계획서):**
- 익명방, 비속어 필터, 신고/타임아웃, audit (Phase 2)
- 실시간 채팅, 채팅 안 읽음 카운트 (Phase 3)
- 투표/설문, 검색 개선 (Phase 4)

**Phase 1에서 의도적으로 보류한 항목 (Phase 1.5에서 추가 가능):**
- **글 수정**: MVP에서는 "삭제 후 다시 작성" 워크플로우로 충분. 수정 화면(`/post/[id]/edit`)은 5~20명 운영 중 실제 필요해지면 추가
- **이메일 인증/비밀번호 재설정 자동화**: MVP에서는 Supabase Studio에서 관리자가 수동 발급
- **댓글 수정/삭제**: 본인 댓글이라도 수정은 보류, 모더가 부적절 댓글을 삭제하는 워크플로우만 RLS로 가능 (UI는 Phase 2에서 신고 시스템과 함께)

---

## 파일 구조 (Phase 1 종료 시점)

```
segyo-hub/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── .env.local.example
├── .gitignore
├── middleware.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      홈 (멤버용 최신글)
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── pending/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                BottomNav 포함
│   │   ├── board/page.tsx            게시판 (자유)
│   │   ├── post/new/page.tsx
│   │   ├── post/[id]/page.tsx
│   │   ├── me/page.tsx
│   │   └── admin/users/page.tsx
│   └── api/
│       ├── posts/route.ts
│       ├── posts/[id]/route.ts
│       ├── comments/route.ts
│       ├── comments/[id]/route.ts
│       ├── reactions/route.ts
│       ├── notifications/read/route.ts
│       └── admin/users/[id]/role/route.ts
├── components/
│   ├── auth/
│   │   ├── SignupForm.tsx
│   │   └── LoginForm.tsx
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   └── NotificationBell.tsx
│   ├── post/
│   │   ├── PostListItem.tsx
│   │   ├── PostDetail.tsx
│   │   └── PostForm.tsx
│   ├── comment/
│   │   ├── CommentTree.tsx
│   │   └── CommentForm.tsx
│   ├── reactions/
│   │   └── LikeButton.tsx
│   └── admin/
│       └── UserTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 브라우저 클라이언트
│   │   ├── server.ts                 서버 컴포넌트/route handler
│   │   └── service.ts                서비스 롤(트리거 외 사용 금지)
│   ├── permissions.ts                역할 가드 헬퍼
│   └── permissions.test.ts
├── types/
│   └── database.ts                   Supabase에서 생성한 타입
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_profiles.sql
    │   ├── 0002_posts.sql
    │   ├── 0003_comments.sql
    │   ├── 0004_reactions.sql
    │   └── 0005_notifications.sql
    └── seed.sql
```

각 파일의 책임은 한 가지로 한정한다. 예: `PostListItem`은 글 1개를 카드로 표시할 뿐 fetching이나 mutation을 직접 하지 않는다. `LikeButton`은 자체 상태와 mutation을 관리하며 부모는 `targetType`/`targetId`/`initialLiked`/`initialCount`만 넘긴다.

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `C:\projects\Segyo Hub\segyo-hub\` (전체 Next.js 프로젝트)
- Create: `C:\projects\Segyo Hub\.gitignore` (root에 git init 후)

- [ ] **Step 1: 작업 디렉토리에서 git 초기화**

```powershell
cd "C:\projects\Segyo Hub"
git init
git branch -M main
```

- [ ] **Step 2: Next.js 앱 생성**

```powershell
npx create-next-app@latest segyo-hub --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
```

프롬프트 답:
- Turbopack: Yes
- src/ directory: No
- App Router: Yes
- import alias: `@/*`

- [ ] **Step 3: 의존성 설치**

```powershell
cd segyo-hub
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 4: vitest.config.ts 작성**

`segyo-hub/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

`segyo-hub/package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: 헬스체크 — 빌드와 첫 테스트**

```powershell
npm run build
```
Expected: 빌드 성공

빠른 확인용 더미 테스트 `segyo-hub/lib/__tests__/sanity.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('1+1=2', () => {
    expect(1 + 1).toBe(2)
  })
})
```

```powershell
npm test
```
Expected: 1 passed

테스트 통과 후 `lib/__tests__/sanity.test.ts` 삭제.

- [ ] **Step 6: 커밋**

```powershell
cd ..
# .gitignore에 segyo-hub/.env.local 등이 자동 포함됨
git add .
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest"
```

---

## Task 2: Supabase 프로젝트 + 환경 변수

**Files:**
- Create: `segyo-hub/.env.local` (gitignored)
- Create: `segyo-hub/.env.local.example`
- Create: `segyo-hub/lib/supabase/client.ts`
- Create: `segyo-hub/lib/supabase/server.ts`
- Create: `segyo-hub/lib/supabase/service.ts`

- [ ] **Step 1: Supabase 프로젝트 생성 (수동)**

브라우저에서 https://supabase.com/dashboard 접속:
1. New Project → name: `segyo-hub`, region: `Northeast Asia (Seoul)`
2. Database password 저장
3. 생성 완료까지 1~2분 대기
4. Settings → API에서 다음 값 복사:
   - Project URL
   - `anon` public key
   - `service_role` secret key

- [ ] **Step 2: 환경 변수 파일 작성**

`segyo-hub/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`segyo-hub/.env.local.example` (커밋되는 템플릿):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: 브라우저용 Supabase 클라이언트**

`segyo-hub/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: 서버용 Supabase 클라이언트**

`segyo-hub/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 호출 시 set이 무시됨 — 정상
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: 서비스 롤 클라이언트 (관리자 권한 우회용, RPC/트리거에서만 사용)**

`segyo-hub/lib/supabase/service.ts`:
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

⚠️ 이 파일은 server-only로 취급. 클라이언트 컴포넌트에서 import 금지.

- [ ] **Step 6: 커밋**

```powershell
git add segyo-hub/.env.local.example segyo-hub/lib/supabase/
git commit -m "chore: add Supabase clients for browser/server/service"
```

---

## Task 3: profiles 테이블 + RLS

**Files:**
- Create: `segyo-hub/supabase/migrations/0001_profiles.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

`segyo-hub/supabase/migrations/0001_profiles.sql`:
```sql
-- Role enum
create type user_role as enum ('pending', 'member', 'moderator', 'admin', 'banned');

-- Profile table (1:1 with auth.users)
create table public.profiles (
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

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.profiles enable row level security;

-- 본인 row 읽기
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

-- 멤버 이상은 다른 멤버의 닉네임/role 조회 가능 (작성자 표시용)
create policy "profiles_member_select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 본인 닉네임/학년반 수정 (role/timeout은 X)
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
```

- [ ] **Step 2: 마이그레이션 적용 (Supabase Studio SQL editor)**

브라우저에서 Supabase 프로젝트 → SQL Editor → New query에 위 파일 내용 복붙 → Run.
Expected: `Success. No rows returned`

- [ ] **Step 3: Supabase에서 첫 어드민 계정 시드**

먼저 Authentication → Users → "Add user" → email + password 입력하여 본인 계정 생성. 이 user의 UUID 복사.

SQL Editor에서:
```sql
update public.profiles
set role = 'admin', nickname = 'admin', agreed_to_terms_at = now()
where id = '<your-user-uuid>';
```

Expected: `1 row affected`

- [ ] **Step 4: 타입 생성 (선택, 편의용)**

```powershell
npx supabase login
npx supabase gen types typescript --project-id <your-project-id> > segyo-hub/types/database.ts
```

생성 실패하면 Phase 1에서는 `any`로 캐스팅하고 넘어가도 됨.

- [ ] **Step 5: 커밋**

```powershell
git add segyo-hub/supabase/migrations/0001_profiles.sql segyo-hub/types/
git commit -m "feat(db): add profiles table with RLS and role/timeout RPCs"
```

---

## Task 4: 권한 헬퍼 + 단위 테스트

**Files:**
- Create: `segyo-hub/lib/permissions.ts`
- Test: `segyo-hub/lib/permissions.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`segyo-hub/lib/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canPost, canModerate, canAdmin, isInTimeout } from './permissions'

describe('permissions', () => {
  it('pending cannot post', () => {
    expect(canPost({ role: 'pending', timeout_until: null })).toBe(false)
  })

  it('member can post', () => {
    expect(canPost({ role: 'member', timeout_until: null })).toBe(true)
  })

  it('member in timeout cannot post', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(canPost({ role: 'member', timeout_until: future })).toBe(false)
  })

  it('member with expired timeout can post', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(canPost({ role: 'member', timeout_until: past })).toBe(true)
  })

  it('banned cannot post', () => {
    expect(canPost({ role: 'banned', timeout_until: null })).toBe(false)
  })

  it('moderator can moderate, member cannot', () => {
    expect(canModerate({ role: 'moderator', timeout_until: null })).toBe(true)
    expect(canModerate({ role: 'member', timeout_until: null })).toBe(false)
  })

  it('only admin can admin', () => {
    expect(canAdmin({ role: 'admin', timeout_until: null })).toBe(true)
    expect(canAdmin({ role: 'moderator', timeout_until: null })).toBe(false)
  })

  it('isInTimeout reflects timeout_until', () => {
    expect(isInTimeout({ role: 'member', timeout_until: null })).toBe(false)
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isInTimeout({ role: 'member', timeout_until: future })).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```powershell
cd segyo-hub
npm test
```
Expected: FAIL — `Cannot find module './permissions'`

- [ ] **Step 3: 구현**

`segyo-hub/lib/permissions.ts`:
```ts
export type UserRole = 'pending' | 'member' | 'moderator' | 'admin' | 'banned'

export type ProfileLike = {
  role: UserRole
  timeout_until: string | null
}

export function isInTimeout(p: ProfileLike): boolean {
  if (!p.timeout_until) return false
  return new Date(p.timeout_until).getTime() > Date.now()
}

export function canPost(p: ProfileLike): boolean {
  if (p.role === 'pending' || p.role === 'banned') return false
  if (isInTimeout(p)) return false
  return ['member', 'moderator', 'admin'].includes(p.role)
}

export function canModerate(p: ProfileLike): boolean {
  return p.role === 'moderator' || p.role === 'admin'
}

export function canAdmin(p: ProfileLike): boolean {
  return p.role === 'admin'
}
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
npm test
```
Expected: 8 passed

- [ ] **Step 5: 커밋**

```powershell
cd ..
git add segyo-hub/lib/permissions.ts segyo-hub/lib/permissions.test.ts
git commit -m "feat(lib): add permission helpers with unit tests"
```

---

## Task 5: 미들웨어 — 인증 가드와 라우팅

**Files:**
- Create: `segyo-hub/middleware.ts`

- [ ] **Step 1: 미들웨어 작성**

`segyo-hub/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/signup']
const PENDING_ALLOWED = ['/pending']
const ONBOARDING_PATH = '/onboarding'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 안 됨 + 비공개 경로 → /login
  if (!user) {
    if (PUBLIC_PATHS.includes(pathname)) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 로그인 됨 + /login,/signup → /
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // role과 nickname 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nickname')
    .eq('id', user.id)
    .single()

  if (!profile) return response

  // pending → /pending 외엔 차단
  if (profile.role === 'pending') {
    if (PENDING_ALLOWED.includes(pathname) || pathname === '/pending') return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // banned → /pending (별도 메시지)
  if (profile.role === 'banned') {
    if (pathname === '/pending') return response
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // member 이상인데 nickname 없으면 → /onboarding
  if (!profile.nickname && pathname !== ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // nickname 있는데 /onboarding 들어가면 → /
  if (profile.nickname && pathname === ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: 빌드 통과 확인 (런타임 테스트는 Task 6 이후)**

```powershell
cd segyo-hub
npm run build
```
Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```powershell
cd ..
git add segyo-hub/middleware.ts
git commit -m "feat: add auth middleware for role-based routing"
```

---

## Task 6: 회원가입 페이지

**Files:**
- Create: `segyo-hub/components/auth/SignupForm.tsx`
- Create: `segyo-hub/app/(auth)/signup/page.tsx`

- [ ] **Step 1: 회원가입 폼 컴포넌트**

`segyo-hub/components/auth/SignupForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!agreed) {
      setError('이용약관에 동의해야 가입할 수 있어요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      // profile은 트리거로 자동 생성됨. agreed_to_terms_at만 업데이트.
      await supabase
        .from('profiles')
        .update({ agreed_to_terms_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }
    router.push('/pending')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="email"
        required
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder="비밀번호 (6자 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1"
        />
        <span>
          만 14세 이상이며, 운영자(관리자)가 모든 글과 익명 글의 작성자를
          볼 수 있다는 점에 동의합니다.
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {loading ? '가입 중...' : '가입하기'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: 가입 페이지**

`segyo-hub/app/(auth)/signup/page.tsx`:
```tsx
import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Segyo Hub 가입</h1>
      <SignupForm />
      <p className="mt-4 text-center text-sm">
        이미 계정 있어요?{' '}
        <Link href="/login" className="text-blue-600">로그인</Link>
      </p>
    </main>
  )
}
```

- [ ] **Step 3: 수동 QA**

```powershell
cd segyo-hub
npm run dev
```
브라우저에서 http://localhost:3000/signup 접속 → 새 이메일로 가입 → `/pending`으로 리다이렉트되는지 확인.

Supabase Studio → Authentication → Users에 새 user가 보이는지, public.profiles에 자동 row가 생겼는지 확인.

- [ ] **Step 4: 커밋**

```powershell
cd ..
git add segyo-hub/components/auth/SignupForm.tsx segyo-hub/app/\(auth\)/signup/
git commit -m "feat(auth): signup form with consent checkbox"
```

---

## Task 7: 로그인 페이지

**Files:**
- Create: `segyo-hub/components/auth/LoginForm.tsx`
- Create: `segyo-hub/app/(auth)/login/page.tsx`

- [ ] **Step 1: 로그인 폼**

`segyo-hub/components/auth/LoginForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 맞지 않아요.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        type="email"
        required
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        required
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: 로그인 페이지**

`segyo-hub/app/(auth)/login/page.tsx`:
```tsx
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">로그인</h1>
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        아직 계정 없어요?{' '}
        <Link href="/signup" className="text-blue-600">가입하기</Link>
      </p>
    </main>
  )
}
```

- [ ] **Step 3: 수동 QA**

`npm run dev` 후 Task 3 Step 3에서 만든 admin 계정으로 로그인 → `/`로 이동 → 미들웨어가 nickname 없으면 `/onboarding`(아직 미구현이라 404), 있으면 그대로 — 확인용으로 admin은 nickname 'admin'이 있으니 `/`로 가야 함. 일반 가입 계정은 pending이라 `/pending`(다음 task)으로 감.

- [ ] **Step 4: 커밋**

```powershell
git add segyo-hub/components/auth/LoginForm.tsx segyo-hub/app/\(auth\)/login/
git commit -m "feat(auth): login form"
```

---

## Task 8: 대기자 페이지 (/pending)

**Files:**
- Create: `segyo-hub/app/(auth)/pending/page.tsx`

- [ ] **Step 1: 페이지 작성**

`segyo-hub/app/(auth)/pending/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const banned = profile?.role === 'banned'

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      {banned ? (
        <>
          <h1 className="mb-4 text-2xl font-bold">접근이 차단되었습니다</h1>
          <p className="text-gray-600">
            운영자가 계정을 차단했습니다. 문의는 운영자에게 직접 연락해 주세요.
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold">승인 대기 중</h1>
          <p className="text-gray-600">
            가입은 완료되었지만 아직 운영자의 승인이 필요해요. 승인되면
            바로 글을 쓸 수 있습니다.
          </p>
        </>
      )}
      <form action={logout} className="mt-8">
        <button type="submit" className="text-sm text-blue-600 underline">
          로그아웃
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: 수동 QA**

새 가입 계정으로 로그인 → `/pending`으로 자동 이동되는지 확인.

- [ ] **Step 3: 커밋**

```powershell
git add segyo-hub/app/\(auth\)/pending/
git commit -m "feat(auth): pending and banned states"
```

---

## Task 9: 닉네임 설정 (/onboarding)

**Files:**
- Create: `segyo-hub/app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: 온보딩 페이지**

`segyo-hub/app/(auth)/onboarding/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [gradeClass, setGradeClass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 해요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        grade_class: gradeClass.trim() || null,
      })
      .eq('id', user.id)
    if (error) {
      if (error.code === '23505') setError('이미 사용 중인 닉네임이에요.')
      else setError(error.message)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">환영해요!</h1>
      <p className="mb-6 text-sm text-gray-600">
        닉네임을 정해주세요. 학년반은 선택입니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          required
          maxLength={20}
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="text"
          maxLength={10}
          placeholder="학년반 (예: 1-3) — 선택"
          value={gradeClass}
          onChange={(e) => setGradeClass(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? '저장 중...' : '시작하기'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: 수동 QA — 승급 + 온보딩 흐름**

1. Task 8에서 만든 pending 계정의 ID로 Supabase Studio에서:
   ```sql
   update public.profiles set role = 'member' where id = '<pending-user-uuid>';
   ```
2. 그 계정으로 로그인 → 자동으로 `/onboarding` 이동 → 닉네임 입력 → `/` 이동 확인.

- [ ] **Step 3: 커밋**

```powershell
git add segyo-hub/app/\(auth\)/onboarding/
git commit -m "feat(auth): onboarding nickname/grade"
```

---

## Task 10: posts 테이블 + RLS

**Files:**
- Create: `segyo-hub/supabase/migrations/0002_posts.sql`

- [ ] **Step 1: 마이그레이션 SQL**

`segyo-hub/supabase/migrations/0002_posts.sql`:
```sql
create type board_kind as enum ('free', 'notice', 'qna', 'anon');

create table public.posts (
  id bigserial primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  board board_kind not null default 'free',
  title text not null,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index posts_board_created_idx on public.posts (board, created_at desc) where deleted_at is null;
create index posts_author_idx on public.posts (author_id);

create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.posts enable row level security;

-- 멤버 이상이면 read (단, anon 게시판의 author_id 노출은 view로 제어)
create policy "posts_member_select"
  on public.posts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 멤버 이상 + 타임아웃 아닐 때 insert. 본인 author_id만.
create policy "posts_member_insert"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
      and (p.timeout_until is null or p.timeout_until <= now())
    )
    -- 공지 카테고리는 모더 이상만
    and (
      board <> 'notice'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.role in ('moderator', 'admin')
      )
    )
  );

-- 본인 글만 update
create policy "posts_author_update"
  on public.posts for update
  using (auth.uid() = author_id and deleted_at is null);

-- 본인 또는 모더 이상이 soft delete (= update deleted_at)
-- update 정책으로 처리 (DELETE는 막고 deleted_at update만 허용)
create policy "posts_mod_update"
  on public.posts for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin')
    )
  );
```

- [ ] **Step 2: SQL 적용**

Supabase Studio SQL Editor에서 위 SQL 실행. Expected: 성공.

- [ ] **Step 3: 빠른 RLS 점검 (선택)**

SQL Editor에서 `auth.uid()` 시뮬레이션은 어렵지만, Studio Auth 메뉴에서 두 user(admin/member/pending) 각각 토큰으로 select/insert 시도. 실패 케이스가 차단되는지 확인.

- [ ] **Step 4: 커밋**

```powershell
git add segyo-hub/supabase/migrations/0002_posts.sql
git commit -m "feat(db): add posts table with RLS"
```

---

## Task 11: comments 테이블 + RLS (대댓글)

**Files:**
- Create: `segyo-hub/supabase/migrations/0003_comments.sql`

- [ ] **Step 1: 마이그레이션 SQL**

`segyo-hub/supabase/migrations/0003_comments.sql`:
```sql
create table public.comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.comments(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_comment_id);
create index comments_author_idx on public.comments (author_id);

create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

-- 대댓글 깊이 제한: parent_comment_id가 있으면 그 부모는 parent_comment_id가 null이어야 함 (= 2단계까지만)
create or replace function public.enforce_comment_depth()
returns trigger language plpgsql as $$
declare
  parent_parent bigint;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select parent_comment_id into parent_parent
  from public.comments where id = new.parent_comment_id;
  if parent_parent is not null then
    raise exception '대댓글까지만 가능해요 (2단계 초과 금지)';
  end if;
  return new;
end;
$$;

create trigger comments_enforce_depth
  before insert on public.comments
  for each row execute function public.enforce_comment_depth();

alter table public.comments enable row level security;

create policy "comments_member_select"
  on public.comments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

create policy "comments_member_insert"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
      and (p.timeout_until is null or p.timeout_until <= now())
    )
  );

create policy "comments_author_update"
  on public.comments for update
  using (auth.uid() = author_id and deleted_at is null);

create policy "comments_mod_update"
  on public.comments for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin')
    )
  );
```

- [ ] **Step 2: SQL 적용**

- [ ] **Step 3: 커밋**

```powershell
git add segyo-hub/supabase/migrations/0003_comments.sql
git commit -m "feat(db): add comments table with 2-level depth enforcement"
```

---

## Task 12: reactions 테이블 + RLS

**Files:**
- Create: `segyo-hub/supabase/migrations/0004_reactions.sql`

- [ ] **Step 1: 마이그레이션 SQL**

`segyo-hub/supabase/migrations/0004_reactions.sql`:
```sql
create type reaction_target as enum ('post', 'comment');

create table public.reactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type reaction_target not null,
  target_id bigint not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

create index reactions_target_idx on public.reactions (target_type, target_id);

alter table public.reactions enable row level security;

create policy "reactions_member_select"
  on public.reactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

create policy "reactions_self_insert"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

create policy "reactions_self_delete"
  on public.reactions for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: SQL 적용**

- [ ] **Step 3: 커밋**

```powershell
git add segyo-hub/supabase/migrations/0004_reactions.sql
git commit -m "feat(db): add reactions table for likes on posts/comments"
```

---

## Task 13: notifications 테이블 + 트리거

**Files:**
- Create: `segyo-hub/supabase/migrations/0005_notifications.sql`

- [ ] **Step 1: 마이그레이션 SQL**

`segyo-hub/supabase/migrations/0005_notifications.sql`:
```sql
create type notification_kind as enum ('comment_on_post', 'reply_on_comment');

create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind notification_kind not null,
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

-- 본인 것만 읽기/수정
create policy "notifications_self_select"
  on public.notifications for select using (auth.uid() = user_id);

create policy "notifications_self_update"
  on public.notifications for update using (auth.uid() = user_id);

-- 트리거: 댓글이 달리면 글 작성자에게 알림 (본인 글에 본인 댓글이면 X)
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  parent_author uuid;
begin
  if new.parent_comment_id is null then
    -- 글에 댓글
    select author_id into post_author from public.posts where id = new.post_id;
    if post_author is not null and post_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        post_author,
        'comment_on_post',
        jsonb_build_object('post_id', new.post_id, 'comment_id', new.id, 'actor_id', new.author_id)
      );
    end if;
  else
    -- 댓글에 대댓글
    select author_id into parent_author from public.comments where id = new.parent_comment_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        parent_author,
        'reply_on_comment',
        jsonb_build_object(
          'post_id', new.post_id,
          'parent_comment_id', new.parent_comment_id,
          'comment_id', new.id,
          'actor_id', new.author_id
        )
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();
```

- [ ] **Step 2: SQL 적용**

- [ ] **Step 3: 커밋**

```powershell
git add segyo-hub/supabase/migrations/0005_notifications.sql
git commit -m "feat(db): add notifications table and comment trigger"
```

---

## Task 14: 앱 레이아웃 + 하단 네비게이션

**Files:**
- Create: `segyo-hub/components/layout/BottomNav.tsx`
- Create: `segyo-hub/app/(app)/layout.tsx`
- Modify: `segyo-hub/app/layout.tsx`

- [ ] **Step 1: 루트 레이아웃 다듬기**

`segyo-hub/app/layout.tsx` 내용을 다음으로 교체:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Segyo Hub',
  description: '세교중학교 친구 커뮤니티',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: 하단 네비**

`segyo-hub/components/layout/BottomNav.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: '홈' },
  { href: '/board', label: '게시판' },
  { href: '/me', label: '내정보' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t bg-white">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`py-3 text-center text-sm ${
              active ? 'font-bold text-blue-600' : 'text-gray-600'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

(채팅/익명방 탭은 Phase 2/3에서 추가)

- [ ] **Step 3: (app) 레이아웃**

`segyo-hub/app/(app)/layout.tsx`:
```tsx
import { BottomNav } from '@/components/layout/BottomNav'
import { NotificationBell } from '@/components/layout/NotificationBell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold">Segyo Hub</h1>
        <NotificationBell />
      </header>
      {children}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: NotificationBell 임시 스텁 (Task 21에서 채움)**

`segyo-hub/components/layout/NotificationBell.tsx`:
```tsx
export function NotificationBell() {
  return <div aria-hidden className="text-xl">🔔</div>
}
```

- [ ] **Step 5: 빌드 확인**

```powershell
cd segyo-hub
npm run build
```
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```powershell
cd ..
git add segyo-hub/app/layout.tsx segyo-hub/app/\(app\)/layout.tsx segyo-hub/components/layout/
git commit -m "feat(layout): app shell with bottom nav and bell stub"
```

---

## Task 15: 홈 페이지 + 게시판 목록

**Files:**
- Create: `segyo-hub/app/(app)/board/page.tsx`
- Create: `segyo-hub/components/post/PostListItem.tsx`
- Modify: `segyo-hub/app/page.tsx`

- [ ] **Step 1: PostListItem 컴포넌트**

`segyo-hub/components/post/PostListItem.tsx`:
```tsx
import Link from 'next/link'

export type PostListItemProps = {
  id: number
  title: string
  authorNickname: string | null
  isAnonymous: boolean
  createdAt: string
  commentCount: number
  likeCount: number
}

export function PostListItem(props: PostListItemProps) {
  const author = props.isAnonymous
    ? '익명'
    : (props.authorNickname ?? '(알 수 없음)')
  return (
    <Link
      href={`/post/${props.id}`}
      className="block border-b bg-white px-4 py-3 active:bg-gray-100"
    >
      <p className="line-clamp-1 font-medium">{props.title}</p>
      <div className="mt-1 flex gap-3 text-xs text-gray-500">
        <span>{author}</span>
        <span>{new Date(props.createdAt).toLocaleString('ko-KR')}</span>
        <span>💬 {props.commentCount}</span>
        <span>❤️ {props.likeCount}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: 게시판 페이지 (자유)**

`segyo-hub/app/(app)/board/page.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, is_anonymous, created_at,
      author:profiles!posts_author_id_fkey ( nickname )
    `)
    .eq('board', 'free')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  // counts는 별도 쿼리 (간단히)
  const ids = (posts ?? []).map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids),
  ])

  function count(arr: { post_id?: number; target_id?: number }[] | null, id: number, key: 'post_id' | 'target_id') {
    return (arr ?? []).filter((r) => r[key] === id).length
  }

  return (
    <main>
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 className="font-bold">자유 게시판</h2>
        <Link href="/post/new" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
          새 글
        </Link>
      </div>
      <ul>
        {(posts ?? []).map((p: any) => (
          <li key={p.id}>
            <PostListItem
              id={p.id}
              title={p.title}
              authorNickname={p.author?.nickname ?? null}
              isAnonymous={p.is_anonymous}
              createdAt={p.created_at}
              commentCount={count(comments, p.id, 'post_id')}
              likeCount={count(likes, p.id, 'target_id')}
            />
          </li>
        ))}
        {(posts ?? []).length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            아직 글이 없어요. 첫 글을 써보세요!
          </li>
        )}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: 홈 페이지**

`segyo-hub/app/page.tsx`를 다음으로 교체:
```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Phase 1: 홈은 게시판으로 리다이렉트 (단순)
  redirect('/board')
}
```

- [ ] **Step 4: 수동 QA**

`npm run dev` → admin으로 로그인 → `/board` 진입 → 빈 목록 메시지 보이는지 확인.

- [ ] **Step 5: 커밋**

```powershell
git add segyo-hub/app/\(app\)/board/ segyo-hub/components/post/PostListItem.tsx segyo-hub/app/page.tsx
git commit -m "feat(board): list posts with comment/like counts"
```

---

## Task 16: 글 작성 페이지

**Files:**
- Create: `segyo-hub/components/post/PostForm.tsx`
- Create: `segyo-hub/app/(app)/post/new/page.tsx`

- [ ] **Step 1: PostForm 컴포넌트**

`segyo-hub/components/post/PostForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function PostForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (title.trim().length === 0 || content.trim().length === 0) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        board: 'free',
        title: title.trim(),
        content: content.trim(),
      })
      .select('id')
      .single()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push(`/post/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 px-4 py-4">
      <input
        type="text"
        required
        maxLength={100}
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      <textarea
        required
        rows={10}
        maxLength={5000}
        placeholder="내용을 입력하세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {loading ? '등록 중...' : '등록'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: 새 글 페이지**

`segyo-hub/app/(app)/post/new/page.tsx`:
```tsx
import { PostForm } from '@/components/post/PostForm'

export default function NewPostPage() {
  return (
    <main>
      <header className="border-b bg-white px-4 py-3 font-bold">새 글</header>
      <PostForm />
    </main>
  )
}
```

- [ ] **Step 3: 수동 QA**

admin으로 `/post/new` 진입 → 글 작성 → `/post/[id]`로 이동 (페이지가 아직 없으면 404, 다음 task에서 만듦). DB에 row 들어갔는지 Supabase Studio에서 확인.

- [ ] **Step 4: 커밋**

```powershell
git add segyo-hub/components/post/PostForm.tsx segyo-hub/app/\(app\)/post/new/
git commit -m "feat(post): create new post"
```

---

## Task 17: 글 상세 페이지 (댓글 포함)

**Files:**
- Create: `segyo-hub/components/post/PostDetail.tsx`
- Create: `segyo-hub/components/comment/CommentTree.tsx`
- Create: `segyo-hub/app/(app)/post/[id]/page.tsx`

- [ ] **Step 1: CommentTree (재귀 X, 2단계 평탄화)**

`segyo-hub/components/comment/CommentTree.tsx`:
```tsx
import type { ReactNode } from 'react'

export type CommentNode = {
  id: number
  authorNickname: string | null
  isAnonymous: boolean
  content: string
  createdAt: string
  parentId: number | null
}

export function CommentTree({
  comments,
  renderActions,
}: {
  comments: CommentNode[]
  renderActions?: (c: CommentNode) => ReactNode
}) {
  const tops = comments.filter((c) => c.parentId === null)
  const repliesByParent = new Map<number, CommentNode[]>()
  for (const c of comments) {
    if (c.parentId !== null) {
      const arr = repliesByParent.get(c.parentId) ?? []
      arr.push(c)
      repliesByParent.set(c.parentId, arr)
    }
  }

  return (
    <ul className="divide-y bg-white">
      {tops.map((c) => (
        <li key={c.id} className="px-4 py-3">
          <CommentBlock c={c} actions={renderActions?.(c)} />
          <ul className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
            {(repliesByParent.get(c.id) ?? []).map((r) => (
              <li key={r.id}>
                <CommentBlock c={r} actions={renderActions?.(r)} reply />
              </li>
            ))}
          </ul>
        </li>
      ))}
      {tops.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-gray-500">
          첫 댓글을 남겨보세요.
        </li>
      )}
    </ul>
  )
}

function CommentBlock({
  c,
  actions,
  reply,
}: {
  c: CommentNode
  actions?: ReactNode
  reply?: boolean
}) {
  const author = c.isAnonymous ? '익명' : (c.authorNickname ?? '(알 수 없음)')
  return (
    <div>
      <div className="flex gap-2 text-xs text-gray-500">
        {reply && <span>↳</span>}
        <span className="font-medium text-gray-700">{author}</span>
        <span>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
      {actions && <div className="mt-1">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 2: PostDetail**

`segyo-hub/components/post/PostDetail.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CommentTree, type CommentNode } from '@/components/comment/CommentTree'
import { LikeButton } from '@/components/reactions/LikeButton'

export type PostDetailData = {
  id: number
  title: string
  content: string
  authorId: string
  authorNickname: string | null
  isAnonymous: boolean
  createdAt: string
  isMine: boolean
  canModerate: boolean
  initialPostLiked: boolean
  initialPostLikeCount: number
  commentLikeMap: Record<number, { liked: boolean; count: number }>
  comments: CommentNode[]
}

export function PostDetail({ data }: { data: PostDetailData }) {
  const router = useRouter()
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submitComment() {
    if (!text.trim()) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const { error } = await supabase.from('comments').insert({
      post_id: data.id,
      author_id: user.id,
      parent_comment_id: replyTo,
      content: text.trim(),
    })
    setSubmitting(false)
    if (error) {
      alert(error.message)
      return
    }
    setText('')
    setReplyTo(null)
    router.refresh()
  }

  async function deletePost() {
    if (!confirm('정말 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', data.id)
    router.push('/board')
    router.refresh()
  }

  return (
    <main>
      <article className="border-b bg-white px-4 py-4">
        <h1 className="text-lg font-bold">{data.title}</h1>
        <div className="mt-1 flex gap-2 text-xs text-gray-500">
          <span>{data.isAnonymous ? '익명' : (data.authorNickname ?? '?')}</span>
          <span>{new Date(data.createdAt).toLocaleString('ko-KR')}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap">{data.content}</p>
        <div className="mt-3 flex items-center gap-3">
          <LikeButton
            targetType="post"
            targetId={data.id}
            initialLiked={data.initialPostLiked}
            initialCount={data.initialPostLikeCount}
          />
          {(data.isMine || data.canModerate) && (
            <button onClick={deletePost} className="text-xs text-red-600">
              삭제
            </button>
          )}
        </div>
      </article>

      <CommentTree
        comments={data.comments}
        renderActions={(c) => {
          const lk = data.commentLikeMap[c.id] ?? { liked: false, count: 0 }
          return (
            <div className="flex gap-3 text-xs">
              <LikeButton
                targetType="comment"
                targetId={c.id}
                initialLiked={lk.liked}
                initialCount={lk.count}
                small
              />
              {c.parentId === null && (
                <button onClick={() => setReplyTo(c.id)} className="text-blue-600">
                  답글
                </button>
              )}
            </div>
          )
        }}
      />

      <div className="sticky bottom-16 border-t bg-white p-3">
        {replyTo !== null && (
          <p className="mb-1 text-xs text-gray-500">
            답글 작성 중 ·{' '}
            <button onClick={() => setReplyTo(null)} className="text-blue-600">
              취소
            </button>
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={replyTo !== null ? '답글 입력' : '댓글 입력'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            onClick={submitComment}
            disabled={submitting || !text.trim()}
            className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 글 상세 서버 컴포넌트**

`segyo-hub/app/(app)/post/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetail, type PostDetailData } from '@/components/post/PostDetail'
import { canModerate, type UserRole } from '@/lib/permissions'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  if (!Number.isFinite(postId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: me } = await supabase
    .from('profiles')
    .select('role, timeout_until')
    .eq('id', user.id)
    .single()

  const { data: post } = await supabase
    .from('posts')
    .select(`
      id, title, content, author_id, is_anonymous, created_at, deleted_at,
      author:profiles!posts_author_id_fkey ( nickname )
    `)
    .eq('id', postId)
    .single()
  if (!post || post.deleted_at) notFound()

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, post_id, author_id, parent_comment_id, content, is_anonymous, created_at, deleted_at,
      author:profiles!comments_author_id_fkey ( nickname )
    `)
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const commentIds = (comments ?? []).map((c: any) => c.id)
  const { data: postLikes } = await supabase
    .from('reactions')
    .select('user_id')
    .eq('target_type', 'post')
    .eq('target_id', postId)
  const { data: commentLikes } = await supabase
    .from('reactions')
    .select('user_id, target_id')
    .eq('target_type', 'comment')
    .in('target_id', commentIds.length > 0 ? commentIds : [-1])

  const initialPostLikeCount = (postLikes ?? []).length
  const initialPostLiked = (postLikes ?? []).some((r: any) => r.user_id === user.id)

  const commentLikeMap: Record<number, { liked: boolean; count: number }> = {}
  for (const id of commentIds) commentLikeMap[id] = { liked: false, count: 0 }
  for (const r of commentLikes ?? []) {
    const slot = commentLikeMap[(r as any).target_id]
    if (!slot) continue
    slot.count += 1
    if ((r as any).user_id === user.id) slot.liked = true
  }

  const data: PostDetailData = {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.author_id,
    authorNickname: (post as any).author?.nickname ?? null,
    isAnonymous: post.is_anonymous,
    createdAt: post.created_at,
    isMine: post.author_id === user.id,
    canModerate: canModerate({ role: (me?.role ?? 'pending') as UserRole, timeout_until: me?.timeout_until ?? null }),
    initialPostLiked,
    initialPostLikeCount,
    commentLikeMap,
    comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      authorNickname: c.author?.nickname ?? null,
      isAnonymous: c.is_anonymous,
      content: c.content,
      createdAt: c.created_at,
      parentId: c.parent_comment_id,
    })),
  }

  return <PostDetail data={data} />
}
```

- [ ] **Step 4: 커밋 (LikeButton은 다음 task에서 추가, 임시 스텁이 필요하면 다음 task와 함께 빌드)**

LikeButton이 아직 없어서 빌드 실패할 수 있음. Task 18을 먼저 완료하고 합쳐서 커밋해도 됨.

다음 task 완료 후:
```powershell
git add segyo-hub/components/post/PostDetail.tsx segyo-hub/components/comment/CommentTree.tsx segyo-hub/app/\(app\)/post/\[id\]/
git commit -m "feat(post): post detail with comments and replies"
```

---

## Task 18: 좋아요 버튼

**Files:**
- Create: `segyo-hub/components/reactions/LikeButton.tsx`

- [ ] **Step 1: LikeButton**

`segyo-hub/components/reactions/LikeButton.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  small,
}: {
  targetType: 'post' | 'comment'
  targetId: number
  initialLiked: boolean
  initialCount: number
  small?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }
    if (liked) {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
      if (!error) {
        setLiked(false)
        setCount((c) => c - 1)
      }
    } else {
      const { error } = await supabase.from('reactions').insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      })
      if (!error) {
        setLiked(true)
        setCount((c) => c + 1)
      }
    }
    setBusy(false)
  }

  const cls = small ? 'text-xs' : 'text-sm'
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`${cls} ${liked ? 'text-red-600' : 'text-gray-600'}`}
    >
      {liked ? '❤️' : '🤍'} {count}
    </button>
  )
}
```

- [ ] **Step 2: 빌드 + 수동 QA**

```powershell
cd segyo-hub
npm run build
npm run dev
```

admin으로 글 작성 → 글 상세 진입 → 좋아요 토글, 댓글 작성, 답글 작성 모두 동작 확인.

- [ ] **Step 3: 커밋**

```powershell
cd ..
git add segyo-hub/components/reactions/LikeButton.tsx segyo-hub/components/post/PostDetail.tsx segyo-hub/components/comment/CommentTree.tsx segyo-hub/app/\(app\)/post/\[id\]/
git commit -m "feat: like button for posts and comments + post detail"
```

---

## Task 19: 알림 종 + 배지

**Files:**
- Modify: `segyo-hub/components/layout/NotificationBell.tsx`
- Create: `segyo-hub/app/api/notifications/read/route.ts`

- [ ] **Step 1: API — 모두 읽음 처리**

`segyo-hub/app/api/notifications/read/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: NotificationBell 채우기**

`segyo-hub/components/layout/NotificationBell.tsx` 교체:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Notif = {
  id: number
  kind: 'comment_on_post' | 'reply_on_comment'
  payload: { post_id: number; comment_id: number; parent_comment_id?: number; actor_id: string }
  read_at: string | null
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const unread = items.filter((i) => i.read_at === null).length

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data as any) ?? [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  async function markRead() {
    await fetch('/api/notifications/read', { method: 'POST' })
    load()
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="알림"
        onClick={() => setOpen((v) => !v)}
        className="relative text-xl"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded border bg-white shadow">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">알림</span>
            <button onClick={markRead} className="text-xs text-blue-600">
              모두 읽음
            </button>
          </div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-gray-500">없음</li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`cursor-pointer border-b px-3 py-2 text-sm ${
                  n.read_at === null ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setOpen(false)
                  router.push(`/post/${n.payload.post_id}`)
                }}
              >
                {n.kind === 'comment_on_post'
                  ? '내 글에 새 댓글이 달렸어요'
                  : '내 댓글에 답글이 달렸어요'}
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(n.created_at).toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 수동 QA**

두 개의 멤버 계정으로 다른 브라우저(또는 시크릿)에서 로그인 → A가 글 작성 → B가 댓글 → A의 종에 1 배지 표시되는지 (최대 30초 대기). A가 종 클릭 → 알림 보임 → "모두 읽음" → 배지 사라짐.

- [ ] **Step 4: 커밋**

```powershell
git add segyo-hub/components/layout/NotificationBell.tsx segyo-hub/app/api/notifications/
git commit -m "feat: notification bell with unread badge and mark-read"
```

---

## Task 20: 내 정보 페이지 (로그아웃)

**Files:**
- Create: `segyo-hub/app/(app)/me/page.tsx`

- [ ] **Step 1: 페이지**

`segyo-hub/app/(app)/me/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, role, grade_class')
    .eq('id', user.id)
    .single()

  async function logout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const showAdmin = profile?.role === 'admin' || profile?.role === 'moderator'

  return (
    <main className="px-4 py-6">
      <h2 className="text-lg font-bold">내 정보</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">닉네임</dt>
          <dd>{profile?.nickname ?? '-'}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">학년반</dt>
          <dd>{profile?.grade_class ?? '-'}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">권한</dt>
          <dd>{profile?.role}</dd>
        </div>
        <div className="flex justify-between border-b pb-2">
          <dt className="text-gray-500">이메일</dt>
          <dd>{user.email}</dd>
        </div>
      </dl>
      {showAdmin && (
        <Link href="/admin/users" className="mt-6 block rounded bg-gray-100 px-3 py-2 text-center">
          관리자 페이지
        </Link>
      )}
      <form action={logout} className="mt-4">
        <button className="w-full rounded border py-2 text-red-600">로그아웃</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: 커밋**

```powershell
git add segyo-hub/app/\(app\)/me/
git commit -m "feat: me page with profile and logout"
```

---

## Task 21: 관리자 — 사용자 관리 페이지

**Files:**
- Create: `segyo-hub/components/admin/UserTable.tsx`
- Create: `segyo-hub/app/(app)/admin/users/page.tsx`
- Create: `segyo-hub/app/api/admin/users/[id]/role/route.ts`

- [ ] **Step 1: 권한 변경 API**

`segyo-hub/app/api/admin/users/[id]/role/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const newRole = body?.role
  const allowed = ['pending', 'member', 'moderator', 'admin', 'banned']
  if (!allowed.includes(newRole)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { error } = await supabase.rpc('admin_set_role', {
    target_id: id,
    new_role: newRole,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: UserTable 컴포넌트**

`segyo-hub/components/admin/UserTable.tsx`:
```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Row = {
  id: string
  nickname: string | null
  email: string | null
  role: 'pending' | 'member' | 'moderator' | 'admin' | 'banned'
  grade_class: string | null
  created_at: string
}

export function UserTable({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function changeRole(id: string, role: Row['role']) {
    if (id === currentUserId && role !== 'admin') {
      if (!confirm('본인 권한을 낮추시겠어요? 이후엔 관리자 페이지에 못 들어와요.')) return
    }
    setError(null)
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? '실패')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div className="overflow-x-auto">
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">닉네임/이메일</th>
            <th className="px-3 py-2 text-left">반</th>
            <th className="px-3 py-2 text-left">권한</th>
            <th className="px-3 py-2 text-left">가입</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="px-3 py-2">
                <div className="font-medium">{r.nickname ?? '(미설정)'}</div>
                <div className="text-xs text-gray-500">{r.email ?? '-'}</div>
              </td>
              <td className="px-3 py-2">{r.grade_class ?? '-'}</td>
              <td className="px-3 py-2">
                <select
                  value={r.role}
                  disabled={pending}
                  onChange={(e) => changeRole(r.id, e.target.value as Row['role'])}
                  className="rounded border px-2 py-1"
                >
                  <option value="pending">대기자</option>
                  <option value="member">멤버</option>
                  <option value="moderator">모더</option>
                  <option value="admin">관리자</option>
                  <option value="banned">차단</option>
                </select>
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">
                {new Date(r.created_at).toLocaleDateString('ko-KR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: 페이지 (관리자/모더만 접근)**

`segyo-hub/app/(app)/admin/users/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { UserTable } from '@/components/admin/UserTable'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!me || (me.role !== 'admin' && me.role !== 'moderator')) {
    redirect('/')
  }

  // service role로 auth.users.email 조회
  const svc = createServiceClient()
  const { data: { users: authUsers } } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
  const emailById = new Map(authUsers.map((u) => [u.id, u.email ?? null]))

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, role, grade_class, created_at')
    .order('created_at', { ascending: false })

  const rows = (profiles ?? []).map((p: any) => ({
    id: p.id,
    nickname: p.nickname,
    email: emailById.get(p.id) ?? null,
    role: p.role,
    grade_class: p.grade_class,
    created_at: p.created_at,
  }))

  return (
    <main>
      <header className="border-b bg-white px-4 py-3">
        <h2 className="font-bold">사용자 관리</h2>
        <p className="text-xs text-gray-500">
          {me.role === 'admin'
            ? '권한 변경/차단 모두 가능합니다.'
            : '모더는 권한 변경 권한이 제한될 수 있어요 (관리자만 admin 지정 가능).'}
        </p>
      </header>
      <UserTable rows={rows} currentUserId={user.id} />
    </main>
  )
}
```

- [ ] **Step 4: 수동 QA**

admin 계정으로 `/admin/users` 진입 → pending 계정의 권한을 `member`로 변경 → 새로고침 시 반영 확인. Supabase Studio에서 변경된 row 확인.

- [ ] **Step 5: 커밋**

```powershell
git add segyo-hub/components/admin/ segyo-hub/app/\(app\)/admin/ segyo-hub/app/api/admin/
git commit -m "feat(admin): user management with role change"
```

---

## Task 22: Vercel 배포

**Files:**
- 변경 없음 (Vercel 대시보드 작업)

- [ ] **Step 1: GitHub 레포 생성 (수동)**

GitHub에서 새 레포 `segyo-hub` 생성 (private 권장).

```powershell
cd "C:\projects\Segyo Hub"
git remote add origin https://github.com/<your-username>/segyo-hub.git
git push -u origin main
```

- [ ] **Step 2: Vercel 프로젝트 생성**

https://vercel.com/new → GitHub 연동 → `segyo-hub` 선택 → Root Directory: `segyo-hub` (Next.js가 그 안에 있음).

Environment Variables 추가:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy 클릭.

- [ ] **Step 3: 헬스체크**

생성된 `*.vercel.app` URL에서:
1. `/signup` → 새 계정 가입 → `/pending` 확인
2. Supabase Studio에서 해당 계정을 `member`로 승격
3. 다시 로그인 → `/onboarding` → 닉네임 → `/board`
4. 글 작성 → 댓글 → 좋아요 → 알림 종 동작 확인

- [ ] **Step 4: README 작성 (간단)**

`C:\projects\Segyo Hub\README.md`:
```markdown
# Segyo Hub

세교중학교 친구 커뮤니티 (비공식, Phase 1).

## 개발

```bash
cd segyo-hub
npm install
cp .env.local.example .env.local  # 값 채우기
npm run dev
```

## 배포

Vercel에 자동 배포 (main push 시).

## 문서

- 설계: `docs/superpowers/specs/2026-05-07-segyo-hub-design.md`
- Phase 1 계획: `docs/superpowers/plans/2026-05-07-segyo-hub-phase1-foundation.md`
```

- [ ] **Step 5: 최종 커밋**

```powershell
git add README.md
git commit -m "docs: add README"
git push
```

---

## Phase 1 완료 정의

다음이 모두 통과하면 Phase 1 완료:
- [ ] 무료 Vercel URL에서 사이트 접근 가능
- [ ] 새 계정 가입 시 자동으로 pending → 관리자 승급 후 멤버 사용 가능
- [ ] 가입 동의 체크박스에 체크 안 하면 가입 막힘
- [ ] 자유 게시판에서 글/댓글/대댓글 작성 가능
- [ ] 좋아요 토글이 글/댓글/대댓글에서 모두 동작
- [ ] 댓글이 달리면 글쓴이의 종 배지에 표시 (최대 30초)
- [ ] 관리자 페이지에서 멤버의 권한 변경 가능
- [ ] 미들웨어가 권한별 라우팅을 강제 (pending이 글쓰기 페이지 접근 시 `/pending`으로 redirect)
- [ ] `npm test` 통과 (permissions 단위 테스트 8개)

## Phase 2 예고 (다음 계획서)

- 익명방 (`board='anon'` 활용 + 익명 ID 매핑 + RLS로 author_id 차단)
- 비속어 필터 (lib/profanity.ts) 와 마스킹
- 신고 큐 / 타임아웃 / 추방
- audit_log

다음 계획서: `docs/superpowers/plans/<future-date>-segyo-hub-phase2-moderation.md`
