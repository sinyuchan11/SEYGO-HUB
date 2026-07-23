# 게시판 카드/리스트 뷰 + Lucide 아이콘 마이그레이션 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 전역의 이모지·텍스트 기호를 Lucide 아이콘으로 교체하고, 자유 게시판에 카드 그리드 / 리스트 두 가지 뷰를 붙인다 (기본값 카드 그리드).

**Architecture:** `components/ui/icons.tsx`를 `lucide-react` 위의 얇은 래퍼로 재작성해 호출부를 건드리지 않고 아이콘 소스를 바꾼다. 게시판 뷰 상태는 URL 쿼리 `?view=`가 진실 공급원이고 쿠키 `board_view`가 기본값을 기억한다. 뷰 결정 로직은 순수 함수 `resolveBoardView`로 분리해 단위 테스트한다. 카드/리스트는 공통 prop 타입 하나(`PostSummaryProps`)를 공유하는 별도 프레젠테이션 컴포넌트 2개다.

**Tech Stack:** Next.js 16.2.6 (App Router, Server Components), React 19.2, Tailwind CSS 4 (`@theme` 토큰), TypeScript strict, Vitest 4 + @testing-library/react, lucide-react 1.x

**참고 스펙:** `docs/superpowers/specs/2026-07-23-board-views-and-icons-design.md`

## Global Constraints

- **Next.js 16 규약을 먼저 확인할 것.** 이 저장소의 `AGENTS.md`가 요구한다: 코드 작성 전 `node_modules/next/dist/docs/` 아래 해당 가이드를 읽는다. 특히 `cookies()`는 **async** 다 — 반드시 `const cookieStore = await cookies()`.
- **환경변수 없이도 빌드·테스트가 통과해야 한다.** Supabase 키가 없어도 `npm run build` / `npm test`가 성공해야 한다. 어떤 코드도 env 미설정 시 throw 하면 안 된다.
- **Tailwind 시맨틱 토큰만 사용한다.** `bg-surface` `bg-canvas` `bg-muted` `border-border` `text-foreground` `text-muted-fg` `text-primary-*` `text-success` `text-warning` `text-danger`. 하드코딩 hex 금지, `dark:` 프리픽스 금지 — 다크모드는 `.dark` 클래스가 토큰을 덮어써서 자동 처리된다.
- **클래스 병합은 `cn()`** (`@/lib/cn`) 을 쓴다.
- **UI 문구는 한국어.**
- **커밋 메시지는 Conventional Commits**, 기존 이력과 동일한 형식: `feat(board): …`, `refactor(ui): …`. 커밋 본문 마지막 줄에 반드시:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- **브랜치:** `feat/profile-phase2a` (현재 브랜치 그대로 작업).
- **테스트 명령:** `npm test` (= `vitest run --passWithNoTests`). 단일 파일은 `npx vitest run <경로>`.
- **타입 체크:** `npx tsc --noEmit`
- **린트:** `npm run lint`

---

## File Structure

**신규 생성**

| 파일 | 책임 |
|---|---|
| `lib/boardView.ts` | 쿼리·쿠키에서 뷰 모드를 결정하는 순수 함수 + 타입 + 쿠키 이름 상수 |
| `lib/boardView.test.ts` | 위 함수 단위 테스트 |
| `components/post/PostSummary.ts` | 카드/리스트가 공유하는 prop 타입 하나 |
| `components/post/PostCard.tsx` | 카드 그리드용 텍스트 중심 컴팩트 카드 |
| `components/post/PostCard.test.tsx` | 카드 렌더링 테스트 |
| `components/post/ViewToggle.tsx` | 카드/리스트 세그먼트 토글 (클라이언트 컴포넌트) |
| `components/post/ViewToggle.test.tsx` | 토글 링크·aria 테스트 |

**수정**

| 파일 | 변경 |
|---|---|
| `package.json` | `lucide-react` 의존성 추가 |
| `components/ui/icons.tsx` | 인라인 SVG → lucide-react 래퍼, 아이콘 9종 추가 |
| `components/layout/LeftRail.tsx` | 이모지 → 아이콘 컴포넌트, 활성 스타일 정리 |
| `components/layout/BottomNav.tsx` | 아이콘 + 라벨 2단 배치 |
| `components/post/PostListItem.tsx` | 4층 → 3층 압축, 공유 prop 타입 사용 |
| `components/ui/ZoomableImage.tsx` | `✕` → `XIcon` |
| `components/admin/InfoCardsEditor.tsx` | `✓` → `CheckIcon` |
| `components/admin/ReportList.tsx` | `→` → `ArrowRightIcon` |
| `app/(app)/page.tsx` | `👋` 제거, `더보기 →` → `ArrowRightIcon`, 손으로 적은 인라인 SVG 4개 → 아이콘 컴포넌트 |
| `app/(app)/board/page.tsx` | 뷰 분기, `ViewToggle` 배치, 링크에 `view` 보존 |

---

## Task 1: lucide-react 도입 + icons.tsx 래퍼 레이어

기존 `components/ui/icons.tsx`는 Lucide 패스를 손으로 옮겨 적은 인라인 SVG다. 이걸 lucide-react 위의 얇은 래퍼로 바꾸면 export 이름이 그대로라 **호출부를 한 줄도 안 고쳐도 된다.** 이 태스크는 그 교체와 신규 아이콘 9종 추가까지다.

**Files:**
- Modify: `package.json`
- Modify: `components/ui/icons.tsx` (전체 재작성)

**Interfaces:**
- Consumes: `cn` from `@/lib/cn`
- Produces:
  - `type IconProps = { size?: number; className?: string }`
  - 기존 유지: `FlameIcon` `ClockIcon` `UtensilsIcon` `CalendarIcon` `MessageIcon` `ReplyIcon` `BellIcon` `SearchIcon` `PenIcon` `FileTextIcon` `SunIcon` `MoonIcon` `PlusIcon` `TrashIcon` — 모두 `(props: IconProps) => JSX.Element`
  - `HeartIcon` — `(props: IconProps & { filled?: boolean }) => JSX.Element`
  - 신규: `HomeIcon` `BoardIcon` `PenSquareIcon` `UserIcon` `GridIcon` `ListIcon` `CheckIcon` `XIcon` `ArrowRightIcon` — 모두 `(props: IconProps) => JSX.Element`

- [ ] **Step 1: lucide-react 설치**

```bash
npm install lucide-react
```

기대: `package.json`의 `dependencies`에 `"lucide-react": "^1.x"`가 추가된다.

Next.js 16은 `lucide-react`를 기본 `optimizePackageImports` 대상으로 갖고 있으므로 `next.config.ts`에 추가 설정은 **하지 않는다.**

- [ ] **Step 2: 설치된 패키지에 필요한 export가 다 있는지 확인**

```bash
node -e "const n=['ArrowRight','Bell','Calendar','Check','Clock','FileText','Flame','Heart','House','LayoutGrid','List','MessageCircle','MessagesSquare','Moon','Pencil','Plus','Reply','Search','SquarePen','Sun','Trash2','UserRound','Utensils','X'];const d=require('fs').readFileSync('node_modules/lucide-react/dist/lucide-react.d.ts','utf8');const miss=n.filter(x=>!new RegExp('\\\\b'+x+'\\\\b').test(d));console.log(miss.length?'MISSING: '+miss.join(', '):'ALL PRESENT')"
```

기대: `ALL PRESENT`

`MISSING: …`가 나오면 해당 아이콘의 실제 이름을 찾아 쓴다:

```bash
node -e "const d=require('fs').readFileSync('node_modules/lucide-react/dist/lucide-react.d.ts','utf8');console.log([...d.matchAll(/declare const (\w+):/g)].map(m=>m[1]).filter(x=>/Home|House|Pen|Square|Messages/i.test(x)).join('\n'))"
```

> **알려진 이름 변경:** Lucide는 `Home` → `House`, `PenSquare` → `SquarePen`으로 이름을 바꾼 이력이 있다. 구버전 이름은 alias로 남아 있는 경우가 많지만, 위 확인 결과에 나온 이름을 그대로 쓴다. 아래 Step 3 코드는 `House`와 `SquarePen`을 가정한다 — Step 2에서 `Home`만 존재한다고 나왔다면 import 이름만 바꾸면 된다.
>
> 위 `.d.ts` 경로가 없으면 대신 실제 파일 목록을 확인한다: `ls node_modules/lucide-react/dist/`

- [ ] **Step 3: `components/ui/icons.tsx` 전체 재작성**

파일 전체를 아래로 교체한다.

```tsx
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  Clock,
  FileText,
  Flame,
  Heart,
  House,
  LayoutGrid,
  List,
  MessageCircle,
  MessagesSquare,
  Moon,
  Pencil,
  Plus,
  Reply,
  Search,
  SquarePen,
  Sun,
  Trash2,
  UserRound,
  Utensils,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type IconProps = { size?: number; className?: string }

type LucideComponent = typeof Check

/**
 * Wrap a Lucide icon so every icon in the app shares one default size, stroke
 * weight and shrink behaviour. Call sites keep the same `{ size, className }`
 * shape the hand-inlined SVGs used to take.
 */
function icon(Source: LucideComponent, name: string) {
  function Icon({ size = 18, className }: IconProps) {
    return (
      <Source
        size={size}
        strokeWidth={2}
        className={cn('shrink-0', className)}
        aria-hidden="true"
      />
    )
  }
  Icon.displayName = name
  return Icon
}

/* ── Content & meta ──────────────────────────────────────────────── */
export const FlameIcon = icon(Flame, 'FlameIcon')
export const ClockIcon = icon(Clock, 'ClockIcon')
export const UtensilsIcon = icon(Utensils, 'UtensilsIcon')
export const CalendarIcon = icon(Calendar, 'CalendarIcon')
export const MessageIcon = icon(MessageCircle, 'MessageIcon')
export const ReplyIcon = icon(Reply, 'ReplyIcon')
export const BellIcon = icon(Bell, 'BellIcon')
export const SearchIcon = icon(Search, 'SearchIcon')
export const PenIcon = icon(Pencil, 'PenIcon')
export const FileTextIcon = icon(FileText, 'FileTextIcon')
export const SunIcon = icon(Sun, 'SunIcon')
export const MoonIcon = icon(Moon, 'MoonIcon')
export const PlusIcon = icon(Plus, 'PlusIcon')
export const TrashIcon = icon(Trash2, 'TrashIcon')

/* ── Navigation ──────────────────────────────────────────────────── */
export const HomeIcon = icon(House, 'HomeIcon')
export const BoardIcon = icon(MessagesSquare, 'BoardIcon')
export const PenSquareIcon = icon(SquarePen, 'PenSquareIcon')
export const UserIcon = icon(UserRound, 'UserIcon')

/* ── Controls ────────────────────────────────────────────────────── */
export const GridIcon = icon(LayoutGrid, 'GridIcon')
export const ListIcon = icon(List, 'ListIcon')
export const CheckIcon = icon(Check, 'CheckIcon')
export const XIcon = icon(X, 'XIcon')
export const ArrowRightIcon = icon(ArrowRight, 'ArrowRightIcon')

/** Heart with an optional solid fill, used for the like button's on-state. */
export function HeartIcon({
  size = 18,
  className,
  filled,
}: IconProps & { filled?: boolean }) {
  return (
    <Heart
      size={size}
      strokeWidth={2}
      fill={filled ? 'currentColor' : 'none'}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    />
  )
}
```

- [ ] **Step 4: 타입 체크로 검증**

```bash
npx tsc --noEmit
```

기대: 출력 없이 종료 (exit 0). 아이콘 이름이 틀렸다면 여기서 `Module '"lucide-react"' has no exported member 'X'`로 잡힌다 — Step 2의 실제 이름으로 고친다.

- [ ] **Step 5: 기존 테스트가 안 깨졌는지 확인**

```bash
npm test
```

기대: 기존 스위트 전부 PASS (Avatar, Badge, Button, InterestsInput, ProfileStats).

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

기대: `✓ Compiled successfully`. 실패하면 다음 태스크로 넘어가지 않는다.

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json components/ui/icons.tsx
git commit -m "$(cat <<'EOF'
refactor(ui): back the icon set with lucide-react

Replace the hand-inlined SVG paths with thin lucide-react wrappers behind
the same export names, and add the nav/control icons the board views need.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 네비게이션 이모지 제거 (LeftRail + BottomNav)

**Files:**
- Modify: `components/layout/LeftRail.tsx`
- Modify: `components/layout/BottomNav.tsx`

**Interfaces:**
- Consumes: `HomeIcon` `BoardIcon` `PenSquareIcon` `UserIcon` from `@/components/ui/icons` (Task 1), `cn` from `@/lib/cn`, `Tooltip`/`TooltipProvider` from `@/components/ui/Tooltip`
- Produces: 없음 (기존 export 이름 `LeftRail`, `BottomNav` 유지)

- [ ] **Step 1: `components/layout/LeftRail.tsx` 전체 교체**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { TooltipProvider, Tooltip } from '@/components/ui/Tooltip'
import {
  HomeIcon,
  BoardIcon,
  PenSquareIcon,
  UserIcon,
} from '@/components/ui/icons'

const items = [
  { href: '/', label: '홈', Icon: HomeIcon },
  { href: '/board', label: '게시판', Icon: BoardIcon },
  { href: '/post/new', label: '글쓰기', Icon: PenSquareIcon },
  { href: '/me', label: '내 정보', Icon: UserIcon },
] as const

export function LeftRail() {
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="hidden shrink-0 py-2 md:block">
        <ul className="sticky top-16 flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface py-3">
          {items.map(({ href, label, Icon }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Tooltip label={label}>
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      active
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-muted-fg hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon size={20} />
                  </Link>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </nav>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: `components/layout/BottomNav.tsx` 전체 교체**

라벨만 있던 모바일 탭바에 같은 아이콘 세트를 아이콘 위 / 라벨 아래로 올린다. `pb-[env(safe-area-inset-bottom)]`로 아이폰 홈 인디케이터 영역을 피한다.

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import {
  HomeIcon,
  BoardIcon,
  PenSquareIcon,
  UserIcon,
} from '@/components/ui/icons'

const tabs = [
  { href: '/', label: '홈', Icon: HomeIcon },
  { href: '/board', label: '게시판', Icon: BoardIcon },
  { href: '/post/new', label: '글쓰기', Icon: PenSquareIcon },
  { href: '/me', label: '내정보', Icon: UserIcon },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map(({ href, label, Icon }) => {
        const active =
          href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 transition-colors',
              active ? 'text-primary-600' : 'text-muted-fg',
            )}
          >
            <Icon size={20} className={active ? 'stroke-[2.5]' : undefined} />
            <span className={cn('text-[11px]', active && 'font-semibold')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: 이모지가 남아 있지 않은지 확인**

```bash
npx tsc --noEmit
grep -nP "[\x{1F300}-\x{1FAFF}]" components/layout/LeftRail.tsx components/layout/BottomNav.tsx
```

기대: `tsc`는 출력 없음. `grep`은 매칭 없음 (exit 1, 출력 없음).

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

기대: `✓ Compiled successfully`

- [ ] **Step 5: 커밋**

```bash
git add components/layout/LeftRail.tsx components/layout/BottomNav.tsx
git commit -m "$(cat <<'EOF'
feat(nav): swap menu emoji for lucide icons and add them to the tab bar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 나머지 이모지·텍스트 기호 정리

홈 인사말의 `👋`, `더보기 →`의 화살표 글자, 저장 완료의 `✓`, 라이트박스 닫기의 `✕`를 전부 아이콘으로 바꾼다.

**Files:**
- Modify: `app/(app)/page.tsx:97` (`👋`), `app/(app)/page.tsx:175-177`, `app/(app)/page.tsx:193-195` (`더보기 →`)
- Modify: `components/admin/ReportList.tsx:62-64` (`신고된 글 보기 →`)
- Modify: `components/admin/InfoCardsEditor.tsx:130` (`저장됐어요 ✓`)
- Modify: `components/ui/ZoomableImage.tsx:54-61` (`✕`)

**Interfaces:**
- Consumes: `ArrowRightIcon` `CheckIcon` `XIcon` from `@/components/ui/icons` (Task 1)
- Produces: 없음

- [ ] **Step 1: `app/(app)/page.tsx` — 인사말 이모지 제거**

97번째 줄을 찾아서:

```tsx
            <p className="truncate text-lg font-bold">안녕하세요, {nickname}님 👋</p>
```

이렇게 바꾼다:

```tsx
            <p className="truncate text-lg font-bold">안녕하세요, {nickname}님</p>
```

- [ ] **Step 2: `app/(app)/page.tsx` — import 줄 교체**

6번째 줄:

```tsx
import { FlameIcon, ClockIcon, UtensilsIcon, CalendarIcon } from '@/components/ui/icons'
```

를 이렇게 바꾼다 (Step 3의 화살표와 Step 3-b의 인라인 SVG 정리에 필요한 아이콘을 한 번에 넣는다):

```tsx
import {
  FlameIcon,
  ClockIcon,
  UtensilsIcon,
  CalendarIcon,
  ArrowRightIcon,
  SearchIcon,
  PenIcon,
  BoardIcon,
  UserIcon,
} from '@/components/ui/icons'
```

- [ ] **Step 3: `app/(app)/page.tsx` — "더보기 →" 두 곳 교체**

인기글 섹션 (175번째 줄 근처):

```tsx
            <Link href="/board?sort=popular" className="text-xs font-medium text-primary-600 hover:underline">
              더보기 →
            </Link>
```

를 이렇게:

```tsx
            <Link
              href="/board?sort=popular"
              className="group inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline"
            >
              더보기
              <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
```

최근 글 섹션 (193번째 줄 근처):

```tsx
          <Link href="/board" className="text-xs font-medium text-primary-600 hover:underline">
            더보기 →
          </Link>
```

를 이렇게:

```tsx
          <Link
            href="/board"
            className="group inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline"
          >
            더보기
            <ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
```

- [ ] **Step 3-b: `app/(app)/page.tsx` — 손으로 적은 인라인 SVG를 아이콘 컴포넌트로**

이 파일에는 아이콘 컴포넌트가 이미 있는데도 SVG를 다시 손으로 적어둔 곳이 4군데 있다. 같은 그림이 두 벌로 관리되는 상태라 정리한다.

106~109번째 줄, 검색 폼의 돋보기:

```tsx
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-fg" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
```

→

```tsx
          <SearchIcon size={18} className="text-muted-fg" />
```

124~127번째 줄, "글쓰기" 퀵액션의 연필:

```tsx
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
```

→

```tsx
          <PenIcon size={22} />
```

130~133번째 줄, "게시판" 퀵액션의 목록:

```tsx
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" />
          </svg>
```

→

```tsx
          <BoardIcon size={22} />
```

136~138번째 줄, "내정보" 퀵액션의 사람:

```tsx
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
```

→

```tsx
          <UserIcon size={22} />
```

이렇게 하면 퀵액션 아이콘이 왼쪽 레일·하단 탭바의 같은 항목과 그림이 일치한다.

- [ ] **Step 4: `components/admin/ReportList.tsx` — 화살표 교체**

8번째 줄(`import { timeAgo } from '@/lib/time'`) 바로 아래에 추가한다:

```tsx
import { ArrowRightIcon } from '@/components/ui/icons'
```

그리고 62번째 줄 근처:

```tsx
              <Link href={`/post/${r.targetId}`} className="font-medium text-primary-600 hover:underline">
                신고된 글 보기 →
              </Link>
```

를 이렇게:

```tsx
              <Link
                href={`/post/${r.targetId}`}
                className="group inline-flex items-center gap-0.5 font-medium text-primary-600 hover:underline"
              >
                신고된 글 보기
                <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
```

- [ ] **Step 5: `components/admin/InfoCardsEditor.tsx` — 체크 표시 교체**

6번째 줄(`import { Button } from '@/components/ui/Button'`) 바로 아래에 추가:

```tsx
import { CheckIcon } from '@/components/ui/icons'
```

130번째 줄 근처:

```tsx
            {savedKey === c.key && <span className="text-xs font-medium text-success">저장됐어요 ✓</span>}
```

를 이렇게:

```tsx
            {savedKey === c.key && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                <CheckIcon size={14} />
                저장됐어요
              </span>
            )}
```

- [ ] **Step 6: `components/ui/ZoomableImage.tsx` — 닫기 버튼 교체**

4번째 줄(`import { cn } from '@/lib/cn'`) 바로 아래에 추가:

```tsx
import { XIcon } from '@/components/ui/icons'
```

54~61번째 줄:

```tsx
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
          >
            ✕
          </button>
```

를 이렇게:

```tsx
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
          >
            <XIcon size={20} />
          </button>
```

- [ ] **Step 7: 소스 전체에서 이모지·기호가 사라졌는지 확인**

```bash
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2190}-\x{21FF}\x{2713}\x{2714}\x{2715}\x{2716}\x{2717}]" --include="*.tsx" --include="*.ts" app components lib
```

기대: 매칭 없음 (출력 없음).

> 매칭이 남으면 스펙 표에 없는 새 위치다. 같은 방식으로 아이콘 컴포넌트로 바꾼다. 단, 리치텍스트 **본문 콘텐츠**(사용자가 쓴 글)나 `app/globals.css`는 대상이 아니다.

- [ ] **Step 8: 타입 체크 + 빌드**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

기대: 셋 다 통과, 빌드 `✓ Compiled successfully`

- [ ] **Step 9: 커밋**

```bash
git add app components
git commit -m "$(cat <<'EOF'
refactor(ui): replace remaining emoji and text glyphs with icons

Covers the home greeting, the "더보기" arrows, the save confirmation check
and the lightbox close button, and folds the home page's hand-inlined SVGs
into the shared icon components.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 뷰 결정 로직 (`lib/boardView.ts`)

게시판 뷰는 URL 쿼리가 우선이고, 없으면 쿠키, 그것도 없으면 `grid`다. 이 우선순위를 서버 컴포넌트 안에 섞지 않고 순수 함수로 빼서 테스트한다.

**Files:**
- Create: `lib/boardView.ts`
- Test: `lib/boardView.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type BoardView = 'grid' | 'list'`
  - `const BOARD_VIEW_COOKIE = 'board_view'`
  - `const BOARD_VIEW_MAX_AGE = 31536000`
  - `function resolveBoardView(param?: string | null, cookie?: string | null): BoardView`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/boardView.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveBoardView, BOARD_VIEW_COOKIE } from './boardView'

describe('resolveBoardView', () => {
  it('uses the query param when it is a known view', () => {
    expect(resolveBoardView('grid')).toBe('grid')
    expect(resolveBoardView('list')).toBe('list')
  })

  it('falls back to the cookie when there is no query param', () => {
    expect(resolveBoardView(undefined, 'list')).toBe('list')
    expect(resolveBoardView(undefined, 'grid')).toBe('grid')
  })

  it('lets the query param win over the cookie', () => {
    expect(resolveBoardView('grid', 'list')).toBe('grid')
    expect(resolveBoardView('list', 'grid')).toBe('list')
  })

  it('defaults to grid when nothing is given', () => {
    expect(resolveBoardView()).toBe('grid')
    expect(resolveBoardView(null, null)).toBe('grid')
  })

  it('ignores unknown values', () => {
    expect(resolveBoardView('masonry')).toBe('grid')
    expect(resolveBoardView('', 'nonsense')).toBe('grid')
    expect(resolveBoardView('masonry', 'list')).toBe('list')
  })

  it('exposes the cookie name it reads', () => {
    expect(BOARD_VIEW_COOKIE).toBe('board_view')
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run lib/boardView.test.ts
```

기대: FAIL — `Failed to resolve import "./boardView"`

- [ ] **Step 3: 구현**

`lib/boardView.ts`:

```ts
/** How the board renders its posts. */
export type BoardView = 'grid' | 'list'

/** Cookie that remembers the reader's last board view. */
export const BOARD_VIEW_COOKIE = 'board_view'

/** One year, in seconds. */
export const BOARD_VIEW_MAX_AGE = 31536000

const VIEWS: readonly string[] = ['grid', 'list']

/**
 * Decide which board view to render. The URL query wins so a shared link
 * always shows what the sender saw; the cookie only supplies the default.
 */
export function resolveBoardView(
  param?: string | null,
  cookie?: string | null,
): BoardView {
  if (param && VIEWS.includes(param)) return param as BoardView
  if (cookie && VIEWS.includes(cookie)) return cookie as BoardView
  return 'grid'
}
```

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run lib/boardView.test.ts
```

기대: PASS — 6 tests

- [ ] **Step 5: 커밋**

```bash
git add lib/boardView.ts lib/boardView.test.ts
git commit -m "$(cat <<'EOF'
feat(board): resolve the board view from query param then cookie

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 공유 prop 타입 + `PostCard`

카드와 리스트는 같은 데이터를 다른 모양으로 보여준다. prop 타입을 한 곳에 두고 둘 다 거기서 가져다 쓴다.

**Files:**
- Create: `components/post/PostSummary.ts`
- Create: `components/post/PostCard.tsx`
- Test: `components/post/PostCard.test.tsx`

**Interfaces:**
- Consumes: `Avatar` from `@/components/ui/Avatar`, `timeAgo` from `@/lib/time`, `MessageIcon` `HeartIcon` from `@/components/ui/icons` (Task 1)
- Produces:
  - `type PostSummaryProps` — `{ id: number; title: string; authorNickname: string | null; authorAvatarUrl?: string | null; isAnonymous: boolean; createdAt: string; commentCount: number; likeCount: number; excerpt?: string; thumbnailUrl?: string | null }`
  - `function resolveAuthor(props): { name: string; avatarSrc: string | null }`
  - `function PostCard(props: PostSummaryProps)`

- [ ] **Step 1: 공유 타입 파일 생성**

`components/post/PostSummary.ts`:

```ts
/** The shape both the card and the list row render. */
export type PostSummaryProps = {
  id: number
  title: string
  authorNickname: string | null
  authorAvatarUrl?: string | null
  isAnonymous: boolean
  createdAt: string
  commentCount: number
  likeCount: number
  excerpt?: string
  thumbnailUrl?: string | null
}

/** Anonymous posts hide both the nickname and the avatar. */
export function resolveAuthor(props: PostSummaryProps) {
  return {
    name: props.isAnonymous ? '익명' : props.authorNickname ?? '(알 수 없음)',
    avatarSrc: props.isAnonymous ? null : props.authorAvatarUrl ?? null,
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`components/post/PostCard.test.tsx`. `next/link`는 App Router 컨텍스트를 요구하므로 테스트에서는 평범한 `<a>`로 목킹한다.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { PostCard } from './PostCard'

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...rest}>{children}</a>
  ),
}))

const base = {
  id: 1,
  title: '가을 축제 후기',
  authorNickname: '홍길동',
  authorAvatarUrl: null,
  isAnonymous: false,
  createdAt: new Date().toISOString(),
  commentCount: 3,
  likeCount: 7,
  excerpt: '축제 다녀왔습니다',
}

describe('PostCard', () => {
  it('renders the title, excerpt, author and counts', () => {
    render(<PostCard {...base} />)
    expect(screen.getByText('가을 축제 후기')).toBeInTheDocument()
    expect(screen.getByText('축제 다녀왔습니다')).toBeInTheDocument()
    expect(screen.getByText('홍길동')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('links to the post', () => {
    render(<PostCard {...base} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/post/1')
  })

  it('shows 익명 instead of the nickname for anonymous posts', () => {
    render(<PostCard {...base} isAnonymous />)
    expect(screen.getByText('익명')).toBeInTheDocument()
    expect(screen.queryByText('홍길동')).not.toBeInTheDocument()
  })

  it('renders no thumbnail when the post has no image', () => {
    const { container } = render(<PostCard {...base} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders a thumbnail when the post has an image', () => {
    const { container } = render(<PostCard {...base} thumbnailUrl="/t.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/t.png')
  })
})
```

- [ ] **Step 3: 실패 확인**

```bash
npx vitest run components/post/PostCard.test.tsx
```

기대: FAIL — `Failed to resolve import "./PostCard"`

- [ ] **Step 4: `components/post/PostCard.tsx` 구현**

`h-full flex flex-col`로 카드 높이를 그리드 행에 맞추고, 본문 영역을 `flex-1`로 늘려 메타줄을 항상 바닥에 붙인다. 썸네일이 없으면 자리표시자를 만들지 않고 텍스트가 폭을 다 쓴다.

```tsx
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/time'
import { MessageIcon, HeartIcon } from '@/components/ui/icons'
import { resolveAuthor, type PostSummaryProps } from './PostSummary'

/** Text-first card used by the board's grid view. */
export function PostCard(props: PostSummaryProps) {
  const { name, avatarSrc } = resolveAuthor(props)

  return (
    <Link
      href={`/post/${props.id}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      {/* Title + excerpt, with the thumbnail tucked to the right */}
      <div className="flex flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-bold leading-snug text-foreground transition-colors group-hover:text-primary-700">
            {props.title}
          </h3>
          {props.excerpt ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-fg">
              {props.excerpt}
            </p>
          ) : null}
        </div>
        {props.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.thumbnailUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : null}
      </div>

      {/* Meta row, pinned to the bottom so cards line up across the grid */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-fg">
        <Avatar name={name} src={avatarSrc} size={24} />
        <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
        <span className="shrink-0">· {timeAgo(props.createdAt)}</span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <MessageIcon size={14} /> {props.commentCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <HeartIcon size={14} /> {props.likeCount}
          </span>
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 5: 통과 확인**

```bash
npx vitest run components/post/PostCard.test.tsx
```

기대: PASS — 5 tests

- [ ] **Step 6: 커밋**

```bash
git add components/post/PostSummary.ts components/post/PostCard.tsx components/post/PostCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(board): add a compact text-first post card for the grid view

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `PostListItem` 압축 재설계

지금은 ①작성자줄 ②제목 ③발췌 ④통계줄로 4층이라 세로를 많이 먹는다. 작성자·시간·댓글·좋아요를 한 줄로 합쳐 3층으로 줄인다. props 시그니처는 그대로라 호출부(`board/page.tsx`, `app/(app)/page.tsx`)는 안 고쳐도 된다.

**Files:**
- Modify: `components/post/PostListItem.tsx` (전체 재작성)

**Interfaces:**
- Consumes: `PostSummaryProps` `resolveAuthor` from `./PostSummary` (Task 5), `Avatar`, `timeAgo`, `MessageIcon` `HeartIcon`
- Produces: `function PostListItem(props: PostSummaryProps)`

> 기존 `PostListItemProps` export는 **삭제한다.** 저장소 어디서도 import 하지 않는 타입이라 남겨두면 죽은 코드다 (`grep -rn "PostListItemProps" --include="*.tsx" app components`로 확인 가능).

- [ ] **Step 1: `components/post/PostListItem.tsx` 전체 교체**

```tsx
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/time'
import { MessageIcon, HeartIcon } from '@/components/ui/icons'
import { resolveAuthor, type PostSummaryProps } from './PostSummary'

/** Dense single-block row used by the board's list view and the home feeds. */
export function PostListItem(props: PostSummaryProps) {
  const { name, avatarSrc } = resolveAuthor(props)

  return (
    <Link
      href={`/post/${props.id}`}
      className="group flex gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-bold text-foreground transition-colors group-hover:text-primary-700">
          {props.title}
        </h3>
        {props.excerpt ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-fg">{props.excerpt}</p>
        ) : null}

        {/* Author, time and counts collapsed into one line */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-fg">
          <Avatar name={name} src={avatarSrc} size={24} />
          <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
          <span className="shrink-0">· {timeAgo(props.createdAt)}</span>
          <span className="flex shrink-0 items-center gap-3 pl-1">
            <span className="inline-flex items-center gap-1">
              <MessageIcon size={14} /> {props.commentCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <HeartIcon size={14} /> {props.likeCount}
            </span>
          </span>
        </div>
      </div>

      {props.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={props.thumbnailUrl}
          alt=""
          className="h-16 w-16 shrink-0 self-center rounded-lg border border-border object-cover"
        />
      ) : null}
    </Link>
  )
}
```

- [ ] **Step 2: 호출부가 안 깨졌는지 타입 체크**

```bash
npx tsc --noEmit
```

기대: 출력 없음. `board/page.tsx`와 `app/(app)/page.tsx`는 같은 props를 넘기므로 변경이 필요 없다.

- [ ] **Step 3: 전체 테스트 + 빌드**

```bash
npm test && npm run build
```

기대: 모든 테스트 PASS, `✓ Compiled successfully`

- [ ] **Step 4: 커밋**

```bash
git add components/post/PostListItem.tsx
git commit -m "$(cat <<'EOF'
feat(board): tighten the post list row to three lines

Merge author, time and counts into one meta line, cutting roughly 40% of
the row height. The home feeds share this component and get denser too.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `ViewToggle` 세그먼트 컨트롤

**Files:**
- Create: `components/post/ViewToggle.tsx`
- Test: `components/post/ViewToggle.test.tsx`

**Interfaces:**
- Consumes: `BoardView` `BOARD_VIEW_COOKIE` `BOARD_VIEW_MAX_AGE` from `@/lib/boardView` (Task 4), `GridIcon` `ListIcon` from `@/components/ui/icons` (Task 1), `cn`
- Produces: `function ViewToggle({ view, sort, q }: { view: BoardView; sort: string; q: string })`

- [ ] **Step 1: 실패하는 테스트 작성**

`components/post/ViewToggle.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { ViewToggle } from './ViewToggle'

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...rest}>{children}</a>
  ),
}))

describe('ViewToggle', () => {
  it('marks the active view as pressed', () => {
    render(<ViewToggle view="grid" sort="latest" q="" />)
    expect(screen.getByLabelText('카드 보기')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('목록 보기')).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the current sort in both links', () => {
    render(<ViewToggle view="grid" sort="popular" q="" />)
    expect(screen.getByLabelText('카드 보기')).toHaveAttribute(
      'href',
      '/board?sort=popular&view=grid',
    )
    expect(screen.getByLabelText('목록 보기')).toHaveAttribute(
      'href',
      '/board?sort=popular&view=list',
    )
  })

  it('keeps and encodes the search query', () => {
    render(<ViewToggle view="list" sort="latest" q="축제 후기" />)
    expect(screen.getByLabelText('목록 보기')).toHaveAttribute(
      'href',
      '/board?sort=latest&view=list&q=%EC%B6%95%EC%A0%9C%20%ED%9B%84%EA%B8%B0',
    )
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npx vitest run components/post/ViewToggle.test.tsx
```

기대: FAIL — `Failed to resolve import "./ViewToggle"`

- [ ] **Step 3: 구현**

`components/post/ViewToggle.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import { GridIcon, ListIcon } from '@/components/ui/icons'
import {
  BOARD_VIEW_COOKIE,
  BOARD_VIEW_MAX_AGE,
  type BoardView,
} from '@/lib/boardView'

/**
 * Segmented control switching the board between the card grid and the list.
 * Navigation carries the choice in the URL; the cookie makes it stick for
 * the reader's next visit.
 */
export function ViewToggle({
  view,
  sort,
  q,
}: {
  view: BoardView
  sort: string
  q: string
}) {
  function href(target: BoardView) {
    const query = q ? `&q=${encodeURIComponent(q)}` : ''
    return `/board?sort=${sort}&view=${target}${query}`
  }

  function remember(target: BoardView) {
    document.cookie = `${BOARD_VIEW_COOKIE}=${target}; path=/; max-age=${BOARD_VIEW_MAX_AGE}; samesite=lax`
  }

  function option(target: BoardView, label: string, Icon: typeof GridIcon) {
    const active = view === target
    return (
      <Link
        href={href(target)}
        onClick={() => remember(target)}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-surface text-foreground shadow-sm'
            : 'text-muted-fg hover:text-foreground',
        )}
      >
        <Icon size={16} />
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {option('grid', '카드 보기', GridIcon)}
      {option('list', '목록 보기', ListIcon)}
    </div>
  )
}
```

> `encodeURIComponent('축제 후기')`는 공백을 `%20`으로 인코딩한다 (`+`가 아니다). 테스트의 기대값이 이에 맞춰져 있다.

- [ ] **Step 4: 통과 확인**

```bash
npx vitest run components/post/ViewToggle.test.tsx
```

기대: PASS — 3 tests

- [ ] **Step 5: 커밋**

```bash
git add components/post/ViewToggle.tsx components/post/ViewToggle.test.tsx
git commit -m "$(cat <<'EOF'
feat(board): add a card/list view toggle that remembers the choice

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 게시판 페이지 배선

**Files:**
- Modify: `app/(app)/board/page.tsx` (전체 재작성)

**Interfaces:**
- Consumes: `resolveBoardView` `BOARD_VIEW_COOKIE` from `@/lib/boardView` (Task 4), `PostCard` from `@/components/post/PostCard` (Task 5), `PostListItem` (Task 6), `ViewToggle` (Task 7), `cookies` from `next/headers`
- Produces: 없음

- [ ] **Step 1: Next.js 16의 `cookies()` 규약 확인**

```bash
head -20 node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md
```

확인할 것: `cookies`는 **async 함수**이므로 `const cookieStore = await cookies()`로 호출한 뒤 `cookieStore.get('name')?.value`로 읽는다. 이 페이지는 이미 `await searchParams`를 쓰는 async 서버 컴포넌트다.

- [ ] **Step 2: `app/(app)/board/page.tsx` 전체 교체**

기존 데이터 페칭·정렬 로직은 그대로 두고, 뷰 결정 / 토글 / 렌더 분기만 추가한다. 정렬 탭 링크와 검색 폼이 `view`를 잃지 않게 하는 것이 핵심이다.

```tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PostListItem } from '@/components/post/PostListItem'
import { PostCard } from '@/components/post/PostCard'
import { ViewToggle } from '@/components/post/ViewToggle'
import { resolveBoardView, BOARD_VIEW_COOKIE } from '@/lib/boardView'
import { extractThumb, toExcerpt } from '@/lib/postPreview'
import { SearchIcon, FileTextIcon, PlusIcon } from '@/components/ui/icons'

type AuthorRel = { nickname: string | null; avatar_url: string | null } | null
type PostRow = {
  id: number
  title: string
  content: string
  is_anonymous: boolean
  created_at: string
  author: AuthorRel
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; view?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const sort = sp.sort === 'popular' ? 'popular' : 'latest'

  const cookieStore = await cookies()
  const view = resolveBoardView(sp.view, cookieStore.get(BOARD_VIEW_COOKIE)?.value)

  const supabase = await createClient()
  let qb = supabase
    .from('posts')
    .select(`
      id, title, content, is_anonymous, created_at,
      author:profiles!posts_author_id_fkey ( nickname, avatar_url )
    `)
    .eq('board', 'free')
    .is('deleted_at', null)
  if (q) qb = qb.ilike('title', `%${q}%`)
  const { data: posts } = await qb
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<PostRow[]>()

  const ids = (posts ?? []).map((p) => p.id)
  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', ids).is('deleted_at', null),
    supabase.from('reactions').select('target_id').eq('target_type', 'post').in('target_id', ids),
  ])

  function count(
    arr: { post_id?: number; target_id?: number }[] | null,
    id: number,
    key: 'post_id' | 'target_id',
  ) {
    return (arr ?? []).filter((r) => r[key] === id).length
  }

  let items = (posts ?? []).map((p) => ({
    post: p,
    commentCount: count(comments, p.id, 'post_id'),
    likeCount: count(likes, p.id, 'target_id'),
  }))
  if (sort === 'popular') {
    items = items.sort(
      (a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount),
    )
  }

  // Shared props for whichever presentation the reader picked.
  const summary = (e: (typeof items)[number]) => ({
    id: e.post.id,
    title: e.post.title,
    authorNickname: e.post.author?.nickname ?? null,
    authorAvatarUrl: e.post.author?.avatar_url ?? null,
    isAnonymous: e.post.is_anonymous,
    createdAt: e.post.created_at,
    commentCount: e.commentCount,
    likeCount: e.likeCount,
    excerpt: toExcerpt(e.post.content),
    thumbnailUrl: extractThumb(e.post.content),
  })

  // Build sort-tab hrefs while preserving the search query and the view.
  const keep = `&view=${view}` + (q ? `&q=${encodeURIComponent(q)}` : '')
  const tab = (key: 'latest' | 'popular', label: string) => {
    const active = sort === key
    return (
      <Link
        href={`/board?sort=${key}${keep}`}
        className={
          'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
          (active
            ? 'bg-primary-600 text-white'
            : 'text-muted-fg hover:bg-muted')
        }
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="px-3 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-4 pt-1">
        <h2 className="text-xl font-bold text-foreground">자유 게시판</h2>
        <p className="mt-0.5 text-sm text-muted-fg">자유롭게 이야기를 나눠보세요</p>
      </div>

      {/* Search */}
      <form action="/board" method="get" className="mb-3">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="view" value={view} />
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100">
          <SearchIcon size={18} className="text-muted-fg" />
          <input
            name="q"
            defaultValue={q}
            placeholder="제목 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-fg"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700">
            검색
          </button>
        </div>
      </form>

      {/* Sort tabs + count + view toggle */}
      <div className="mb-3 flex items-center gap-1.5">
        {tab('latest', '최신순')}
        {tab('popular', '인기순')}
        <span className="ml-auto text-xs text-muted-fg">{items.length}개의 글</span>
        <ViewToggle view={view} sort={sort} q={q} />
      </div>

      {/* Feed */}
      {items.length > 0 ? (
        view === 'grid' ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((e) => (
              <li key={e.post.id}>
                <PostCard {...summary(e)} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {items.map((e) => (
              <li key={e.post.id}>
                <PostListItem {...summary(e)} />
              </li>
            ))}
          </ul>
        )
      ) : q ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <SearchIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">‘{q}’ 검색 결과가 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">다른 검색어로 찾아보세요.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <FileTextIcon size={32} className="mx-auto text-muted-fg" />
          <p className="mt-2 font-medium text-foreground">아직 글이 없어요</p>
          <p className="mt-1 text-sm text-muted-fg">첫 글을 써서 이야기를 시작해보세요!</p>
          <Link
            href="/post/new"
            className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            글쓰기
          </Link>
        </div>
      )}

      {/* Floating action button */}
      <Link
        href="/post/new"
        aria-label="새 글 쓰기"
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/30 transition-transform hover:scale-105 hover:bg-primary-700 md:bottom-8 md:right-8"
      >
        <PlusIcon size={18} className="stroke-[2.5]" />
        글쓰기
      </Link>
    </div>
  )
}
```

> 이 교체에는 인라인 SVG 두 개(검색 아이콘, FAB 플러스)를 `SearchIcon` / `PlusIcon`으로 정리하는 것도 포함된다 — Task 3의 정리 방향과 같다.

- [ ] **Step 3: 타입 체크 + 린트**

```bash
npx tsc --noEmit && npm run lint
```

기대: 둘 다 출력 없이 통과.

- [ ] **Step 4: 빌드**

```bash
npm run build
```

기대: `✓ Compiled successfully`

- [ ] **Step 5: 커밋**

```bash
git add "app/(app)/board/page.tsx"
git commit -m "$(cat <<'EOF'
feat(board): render the board as a card grid or a list

Default to the card grid, carry the choice in the URL and remember it in a
cookie, and keep sort and search intact while switching.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: 최종 검증

코드 변경 없이 전체가 맞물려 도는지 확인하는 태스크다. 여기서 실패가 나오면 해당 태스크로 돌아가 고친다.

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

```bash
npm test
```

기대: 모든 스위트 PASS. 신규 테스트 3개 파일 (`lib/boardView.test.ts` 6 tests, `components/post/PostCard.test.tsx` 5 tests, `components/post/ViewToggle.test.tsx` 3 tests) 포함.

- [ ] **Step 2: 린트 + 타입 체크**

```bash
npm run lint && npx tsc --noEmit
```

기대: 경고·에러 없음.

- [ ] **Step 3: 환경변수 없이 빌드되는지 확인**

```bash
npm run build
```

기대: `✓ Compiled successfully`. Supabase 키가 없는 환경에서도 통과해야 한다.

- [ ] **Step 4: 이모지가 완전히 사라졌는지 최종 확인**

```bash
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2190}-\x{21FF}\x{2713}\x{2714}\x{2715}\x{2716}\x{2717}]" --include="*.tsx" --include="*.ts" app components lib
```

기대: 출력 없음.

- [ ] **Step 5: 개발 서버로 눈으로 확인**

```bash
npm run dev
```

브라우저에서 확인할 것 (Supabase 로그인 필요 — 테스트 계정 `test@test.com` / `test1234`. Supabase 무료 티어는 잠들어 있을 수 있으니 `Failed to fetch`가 나면 대시보드에서 깨운 뒤 재시도):

1. `/board` 첫 진입이 **카드 그리드**로 뜬다.
2. 창을 좁혔다 넓히면 카드가 1열 → 2열 → 3열로 바뀐다.
3. 목록 아이콘을 누르면 리스트로 바뀌고 URL이 `?view=list`가 된다.
4. 다른 페이지로 갔다가 `/board`로 **쿼리 없이** 돌아와도 리스트가 유지된다.
5. 리스트 상태에서 "인기순"을 눌러도 리스트가 유지된다.
6. 리스트 상태에서 검색해도 리스트가 유지되고 검색어가 남는다.
7. 왼쪽 레일 / 모바일 하단 탭바에 이모지가 없고 선택된 항목이 보라색으로 강조된다.
8. 다크모드 토글 후에도 카드·리스트·토글 대비가 정상이다.
9. 홈(`/`)의 인기글·최근 글 목록이 압축된 새 리스트 행으로 보인다.

문제가 없으면 `Ctrl+C`로 종료한다.

- [ ] **Step 6: 이력 확인**

```bash
git log --oneline -9
git status
```

기대: Task 1~8의 커밋 8개가 보이고, 워킹 트리는 clean.
