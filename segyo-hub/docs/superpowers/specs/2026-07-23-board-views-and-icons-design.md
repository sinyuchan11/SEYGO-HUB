# 게시판 카드/리스트 뷰 + 아이콘 세트 교체 — 설계

작성일: 2026-07-23
브랜치: `feat/profile-phase2a`

## 배경

1. 왼쪽 레일 메뉴가 이모지(🏠 📝 ✏️ 👤)를 아이콘으로 쓰고 있다. 이모지는 OS/브라우저마다 렌더링이 달라 디자인 시스템의 통일감을 깬다. 하단 탭바는 아예 아이콘 없이 글자만 있다.
2. 자유 게시판이 리스트 뷰 하나뿐이고, 글 하나가 세로 4층(작성자줄 / 제목 / 본문 / 통계줄)으로 쌓여 공간을 과하게 쓴다. 글이 적을 때 화면이 휑하고, 많아지면 스크롤이 길어진다.

## 목표

- 이모지·텍스트 기호를 전부 SVG 아이콘으로 교체하고, 앱 전체가 하나의 아이콘 언어를 쓰게 한다.
- 게시판에 카드 그리드 뷰를 추가하고, 리스트 뷰를 압축한다. 기본값은 카드 그리드.
- 뷰 선택은 URL로 표현되고 쿠키로 기억된다.

## 비목표 (YAGNI)

- 무한 스크롤 / 페이지네이션 (현행 `limit(50)` 유지)
- 게시판 카테고리 확장, 태그, 필터 추가
- 아이콘 전체 재디자인 — 기존 Lucide 계열 시각 언어를 유지한다

---

## 1. 아이콘 시스템

### 접근

`lucide-react`를 설치하고, `components/ui/icons.tsx`를 **lucide-react 위의 얇은 래퍼 레이어**로 재작성한다. export 이름은 그대로 두어 호출부는 한 곳도 안 고친다.

```tsx
const wrap = (C: LucideIcon) => function Icon({ size = 18, className }: IconProps) {
  return <C size={size} strokeWidth={2} className={cn('shrink-0', className)} aria-hidden="true" />
}

export const MessageIcon = wrap(MessageCircle)
export const HeartIcon = ({ size = 18, className, filled }: IconProps & { filled?: boolean }) => (
  <Heart size={size} strokeWidth={2} fill={filled ? 'currentColor' : 'none'}
         className={cn('shrink-0', className)} aria-hidden="true" />
)
```

기존 인라인 SVG는 이미 Lucide 패스를 손으로 옮겨둔 것이라 교체해도 시각적 변화가 거의 없다.

Next.js 16은 `lucide-react`를 기본 `optimizePackageImports` 대상으로 갖고 있어 사용한 아이콘만 번들에 들어간다. 별도 설정 불필요.

### 매핑

기존 export → Lucide 컴포넌트:

| export | Lucide |
|---|---|
| `FlameIcon` | `Flame` |
| `ClockIcon` | `Clock` |
| `UtensilsIcon` | `Utensils` |
| `CalendarIcon` | `Calendar` |
| `MessageIcon` | `MessageCircle` |
| `ReplyIcon` | `Reply` |
| `BellIcon` | `Bell` |
| `SearchIcon` | `Search` |
| `PenIcon` | `Pencil` |
| `FileTextIcon` | `FileText` |
| `SunIcon` | `Sun` |
| `MoonIcon` | `Moon` |
| `HeartIcon` | `Heart` (+ `filled` shim) |
| `PlusIcon` | `Plus` |
| `TrashIcon` | `Trash2` |

신규 추가:

| export | Lucide | 용도 |
|---|---|---|
| `HomeIcon` | `Home` | 메뉴: 홈 |
| `BoardIcon` | `MessagesSquare` | 메뉴: 게시판 |
| `PenSquareIcon` | `SquarePen` | 메뉴: 글쓰기 |
| `UserIcon` | `UserRound` | 메뉴: 내 정보 |
| `GridIcon` | `LayoutGrid` | 뷰 전환: 카드 |
| `ListIcon` | `List` | 뷰 전환: 리스트 |
| `CheckIcon` | `Check` | 저장 완료 표시 |
| `XIcon` | `X` | 라이트박스 닫기 |
| `ArrowRightIcon` | `ArrowRight` | "더보기" |

> 설치 시 Lucide 버전에 따라 `SquarePen`이 구버전 이름 `PenSquare`일 수 있다. 설치 후 실제 export 이름을 확인하고 맞춘다.

### 이모지·기호 제거 대상

| 파일 | 현재 | 교체 |
|---|---|---|
| `components/layout/LeftRail.tsx:9-12` | 🏠 📝 ✏️ 👤 | `HomeIcon` `BoardIcon` `PenSquareIcon` `UserIcon` |
| `components/layout/BottomNav.tsx` | 아이콘 없음 | 같은 4종 아이콘 + 라벨 |
| `app/(app)/page.tsx:97` | `안녕하세요, {nickname}님 👋` | 이모지 제거 |
| `app/(app)/page.tsx:176,194` | `더보기 →` | `더보기` + `ArrowRightIcon` |
| `components/admin/ReportList.tsx:63` | `신고된 글 보기 →` | `ArrowRightIcon` |
| `components/admin/InfoCardsEditor.tsx:130` | `저장됐어요 ✓` | `CheckIcon` |
| `components/ui/ZoomableImage.tsx:60` | `✕` | `XIcon` |

`app/globals.css`의 리치텍스트 스타일 등 콘텐츠 영역은 손대지 않는다. 사용자가 본문에 쓴 이모지는 대상이 아니다.

### 네비게이션 활성 상태

- **LeftRail**: 활성 항목 `bg-primary-100 text-primary-700`, 비활성 `text-muted-fg hover:bg-muted hover:text-foreground`. 아이콘 크기 20. 툴팁 유지.
- **BottomNav**: 아이콘(20) 위 / 라벨(11px) 아래 세로 배치. 활성 시 아이콘·라벨 모두 `text-primary-600`, 아이콘 `strokeWidth 2.5`, 라벨 `font-semibold`. 비활성 `text-muted-fg`.

---

## 2. 게시판 뷰 전환

### 상태 관리

- URL 쿼리 `?view=grid | list`가 단일 진실 공급원.
- 쿼리가 없으면 쿠키 `board_view`를 읽고, 그것도 없으면 `grid`.
- 사용자가 토글하면 클라이언트에서 쿠키를 1년짜리로 쓰고 해당 URL로 이동한다.

순수 함수로 분리해 테스트한다:

```ts
// lib/boardView.ts
export type BoardView = 'grid' | 'list'
export function resolveBoardView(param?: string, cookie?: string): BoardView
```

우선순위: `param`이 유효하면 그 값 → `cookie`가 유효하면 그 값 → `'grid'`.

보드 페이지는 이미 Supabase 인증 쿠키 때문에 동적 렌더링이므로 `cookies()` 사용에 따른 추가 비용이 없다.

### `ViewToggle` 컴포넌트

`components/post/ViewToggle.tsx` — 클라이언트 컴포넌트.

- `bg-muted` 안에 담긴 세그먼트 컨트롤. 버튼 2개(`GridIcon`, `ListIcon`), 각 32×28.
- 활성 버튼: `bg-surface text-foreground shadow-sm`. 비활성: `text-muted-fg hover:text-foreground`.
- 각 버튼은 현재 `sort`/`q`를 보존한 `<Link>`. `onClick`에서 `document.cookie`를 쓴 뒤 네비게이션이 진행된다.
- 접근성: `aria-label="카드 보기" / "목록 보기"`, 활성 쪽에 `aria-pressed="true"`.

배치: 정렬 탭 줄의 오른쪽. `[최신순][인기순] ......... N개의 글  [▦|☰]`

### 카드 뷰 — `components/post/PostCard.tsx` (신규)

텍스트 중심 컴팩트 카드. 큰 히어로 이미지 영역 없음.

구조:

```
┌ Link (rounded-2xl border bg-surface p-4, h-full flex flex-col) ─┐
│ ┌ 본문 영역 (flex-1) ────────────────┬ 썸네일(있을 때) ─┐        │
│ │ 제목  line-clamp-2  font-bold      │  56×56 rounded-lg │        │
│ │ 발췌  line-clamp-2  text-sm muted  │  object-cover     │        │
│ └────────────────────────────────────┴───────────────────┘        │
│ ─ 하단 메타줄 (mt-3, 항상 바닥) ─                                  │
│ Avatar20 · 이름 · 시간            (오른쪽) □ 댓글수  ♡ 좋아요수   │
└──────────────────────────────────────────────────────────────────┘
```

- 썸네일이 없으면 텍스트가 카드 폭을 다 쓴다. 빈 이미지 자리표시자를 만들지 않는다.
- `h-full flex flex-col` + 발췌 영역 `flex-1`로 카드 높이를 균등하게 맞추고 메타줄을 바닥 정렬한다.
- 호버: `-translate-y-0.5`, `border-primary-200`, `shadow-md`, 제목 `text-primary-700`. 기존 `PostListItem` 호버와 동일한 언어.
- 익명 글은 이름 `익명`, 아바타 `src=null` (기존 규칙 그대로).

그리드 컨테이너: `grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`.

### 리스트 뷰 — `components/post/PostListItem.tsx` (재설계)

현재 4층 구조를 3층으로 압축한다.

```
┌ Link (rounded-2xl border bg-surface px-4 py-3.5) ────────────────┐
│ ┌ 본문 (min-w-0 flex-1) ──────────────┬ 썸네일 64×64 ─┐          │
│ │ 제목  line-clamp-1  font-bold       │               │          │
│ │ 발췌  line-clamp-1  text-sm muted   │               │          │
│ │ 메타  Avatar20 이름 · 시간 · □n ♡n  │               │          │
│ └─────────────────────────────────────┴───────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

핵심 변화: 작성자/시간/댓글/좋아요를 **한 줄로 병합**. 세로 높이가 대략 40% 줄어든다.

`props` 시그니처는 그대로 유지하므로 호출부(`board/page.tsx`, `page.tsx`) 변경 없음. **홈 화면의 인기글/최신글 목록도 같은 컴포넌트를 쓰므로 함께 압축된다.** 의도된 일관성 개선이다.

리스트 컨테이너: `space-y-2` (기존 `space-y-3`에서 축소).

### 게시판 페이지 배선

`app/(app)/board/page.tsx`:

- `searchParams` 타입에 `view?: string` 추가.
- `cookies()`로 `board_view`를 읽어 `resolveBoardView`에 넘긴다.
- 정렬 탭 줄에 `<ViewToggle />` 추가. 탭 링크 href에 `view`를 보존한다.
- `view === 'grid'`면 `<PostCard>` 그리드, 아니면 `<PostListItem>` 리스트를 렌더링한다.
- 검색 폼에 `<input type="hidden" name="view">` 추가해 검색 후에도 뷰가 유지되게 한다.
- 빈 상태 / 검색 결과 없음 / FAB는 그대로.

---

## 테스트

`vitest` + `@testing-library/react` 기존 설정 사용.

1. `lib/boardView.test.ts`
   - 쿼리가 `grid`/`list`면 그 값을 반환
   - 쿼리가 없고 쿠키가 `list`면 `list`
   - 쿼리가 없고 쿠키도 없으면 `grid`
   - 쿼리·쿠키가 쓰레기값이면 `grid`
   - 쿼리가 유효하면 쿠키를 무시
2. `components/post/PostCard.test.tsx`
   - 제목·발췌·작성자·댓글수·좋아요수 렌더링
   - `isAnonymous`면 `익명`으로 표시
   - `thumbnailUrl`이 없으면 `img` 없음
3. `components/post/ViewToggle.test.tsx`
   - 활성 뷰 버튼에 `aria-pressed="true"`
   - 링크 href가 `sort`/`q`를 보존

기존 테스트(Avatar, Badge, Button, InterestsInput, ProfileStats)는 그대로 통과해야 한다.

## 검증

- `npm test` 전체 통과
- `npm run lint` 무경고
- `npm run build` 성공
- Supabase 키 없이도 빌드가 되어야 한다 (기존 제약 유지)

## 변경 파일

신규:
- `lib/boardView.ts`, `lib/boardView.test.ts`
- `components/post/PostCard.tsx`, `components/post/PostCard.test.tsx`
- `components/post/ViewToggle.tsx`, `components/post/ViewToggle.test.tsx`

수정:
- `package.json` (+ `lucide-react`)
- `components/ui/icons.tsx`
- `components/layout/LeftRail.tsx`, `components/layout/BottomNav.tsx`
- `components/post/PostListItem.tsx`
- `components/ui/ZoomableImage.tsx`
- `components/admin/InfoCardsEditor.tsx`, `components/admin/ReportList.tsx`
- `app/(app)/page.tsx`
- `app/(app)/board/page.tsx`
