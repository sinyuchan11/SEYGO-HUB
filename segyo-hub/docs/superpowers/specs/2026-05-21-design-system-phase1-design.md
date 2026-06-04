# Design System Phase 1 — Spec

**Date:** 2026-05-21
**Phase:** 1 of 3 (Design System + App Shell)
**Status:** Approved for plan

## Reference

[Image #1] — gaming/social profile page with purple top bar, left icon rail, multi-column body, right contact rail, card-based feed.

## Goal

Replace the current plain mobile-first chrome (white header + bottom nav only) with a token-driven design system and a 4-zone app shell inspired by the reference, while preserving all existing page content and functionality.

This Phase 1 ships the **foundation** — tokens, base components, and layout shell. The dense feed cards, profile cover/bio, follow system, and badges live in later phases.

## Decisions

| Decision | Value | Why |
|---|---|---|
| Application scope | Design system + full app renewal, decomposed into phases | "전체 페이지 리뉴얼" scope |
| Domain mapping | Borrow reference structure, add new social features in later phases | Reference has features (friends, streaming) we don't need yet |
| Responsive strategy | Tablet-first balanced (desktop 4-zone / tablet 2-zone / mobile 1-zone + bottom nav) | Desktop dense look + preserve existing mobile UX |
| Visual flavor | Refined — purple monochrome scale, white cards, rounded, no neon | Professional but warm; suits Korean community context |
| Component strategy | Tailwind 4 + Radix Primitives where behavior matters | Free accessibility, minimal deps |
| Decomposition | Phase 1: system + shell. Phase 2: profile domain. Phase 3: page-by-page polish | Each phase mergeable on its own |

## Out of scope (later phases)

- Profile cover image, extended bio fields (Phase 2)
- Follow / following system, follower count widgets (Phase 2)
- Badges / achievements (Phase 2)
- View-count and like-aggregation display (Phase 2)
- Dense feed card with image, emoji reactions, share count (Phase 3)
- Page-by-page content redesign (Phase 3)
- Dark mode (later — once tokens stabilize)

## Architecture

### 4-zone app shell

```
app/(app)/layout.tsx
└── <AppShell>
    ├── <TopBar />                   purple, sticky, h-16, all breakpoints
    ├── <LeftRail />                 64px, desktop + tablet only (hidden on mobile)
    ├── <main>{children}</main>      all breakpoints
    ├── <RightRail />                280px, desktop only — children slot
    └── <BottomNav />                mobile only (hidden on tablet + desktop)
```

**Breakpoints:**

- **≥1280px (desktop):** all four zones visible. Grid: `[64px, 1fr, 280px]`.
- **768–1279px (tablet):** TopBar + LeftRail + main. RightRail content stacks below main (or hides if non-essential).
- **<768px (mobile):** TopBar (no search field, compact) + main + BottomNav. LeftRail is fully hidden on mobile; if the BottomNav doesn't cover a route, add it there rather than building a hamburger drawer in Phase 1.

**RightRail slot pattern:** Pages opt in by declaring a `RightRail` element. Decided in implementation between (a) a `<RightRail>` child convention in the page tree, or (b) React Context injection. Either is fine; pick the simpler one.

### Design tokens

Defined in `app/globals.css` via Tailwind 4's `@theme` directive:

**Purple scale (brand):**
- 50 `#F5F3FF`, 100 `#EDE9FE`, 200 `#DDD6FE`, 300 `#C4B5FD`, 400 `#A78BFA`
- **500 `#8B5CF6`, 600 `#7C3AED` (brand)**, 700 `#6D28D9`, 800 `#5B21B6`, 900 `#4C1D95`

**Neutrals:**
- surface `#FFFFFF`, canvas `#F9FAFB`, muted `#F3F4F6`, border `#E5E7EB`, muted-fg `#6B7280`, foreground `#111827`

**Semantic:**
- success `#10B981`, warning `#F59E0B`, danger `#EF4444`, info `#3B82F6`

**Typography:**
- Stack: `'Pretendard', system-ui, -apple-system, sans-serif`
  - NOTE: the existing `globals.css` references `var(--font-geist-sans)` / `var(--font-geist-mono)`, but the root layout never sets up Geist via `next/font`, so those vars are undefined. A `var()` with no fallback that resolves to nothing invalidates the whole `font-family` declaration — so the new stack must NOT reference the Geist vars. Remove the dangling Geist `--font-*` lines from `@theme` as part of this work.
- Display 36 semi · H2 24 semi · H3 18 medium · Body 14 regular · Caption 12 regular
- Body 14 is the default for posts, comments, labels

**Radius:** sm 4 · md 8 · **lg 12** (Card uses this) · full 9999

**Shadow:** subtle. `shadow-sm` `0 1px 2px rgba(17,24,39,.04)`, `shadow-md` 2-layer, `shadow-lg` for modal/dropdown only.

**Spacing:** Tailwind's default scale; standard rhythm is 2 / 3 / 4 / 6 / 8 / 12.

### Component inventory

**`components/ui/` (new — design system primitives):**

| Component | Base | Notes |
|---|---|---|
| `Button` | plain | variants: primary, secondary, ghost, danger × sm/md/lg |
| `IconButton` | plain | aria-label required |
| `Card` | plain | white surface, radius 12, border |
| `Avatar` | plain | sizes 24/32/40/64, initial fallback |
| `Badge` | plain | counter / status (purple / neutral / semantic) |
| `Input` | plain | text + search; TopBar search uses same |
| `Tabs` | `@radix-ui/react-tabs` | profile + board categories |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | avatar menu, post more-actions |
| `Dialog` | `@radix-ui/react-dialog` | confirms; reused later for drawers (Phase 2+) |
| `Tooltip` | `@radix-ui/react-tooltip` | LeftRail icon labels |

**`components/layout/`:**

| Component | Status | Notes |
|---|---|---|
| `AppShell` | new | 4-zone grid container |
| `TopBar` | new | purple, search, notif, avatar menu |
| `LeftRail` | new | active-route highlight via `usePathname` |
| `RightRail` | new | children slot, desktop only |
| `BottomNav` | restyle | tokens applied, behavior unchanged |
| `NotificationBell` | move | from header into `TopBar` |

### File structure

```
app/
  (app)/
    layout.tsx               ← <AppShell> replaces current div
    board/                   (content unchanged)
    post/                    (content unchanged)
    me/                      (content unchanged)
    admin/                   (content unchanged)
  globals.css                ← @theme tokens
components/
  ui/                        ← NEW
    Button.tsx
    IconButton.tsx
    Card.tsx
    Avatar.tsx
    Badge.tsx
    Input.tsx
    Tabs.tsx
    DropdownMenu.tsx
    Dialog.tsx
    Tooltip.tsx
  layout/
    AppShell.tsx             ← NEW
    TopBar.tsx               ← NEW
    LeftRail.tsx             ← NEW
    RightRail.tsx            ← NEW
    BottomNav.tsx            (restyled)
    NotificationBell.tsx     (used inside TopBar)
lib/
  cn.ts                      ← NEW (clsx + tailwind-merge)
```

## Migration approach

- Pages' content code is **not modified**. The only header removed is the app-chrome header in `app/(app)/layout.tsx` (`<header>…Segyo Hub…<NotificationBell/></header>`), since `AppShell`/`TopBar` now own the chrome. **Page-level section headers stay** — e.g. the `<header>` in `post/new/page.tsx` ("새 글") and `admin/users/page.tsx` are contextual page titles, not app chrome; restyle them but do not delete.
- Inside-page raw `<div>` / `<button>` markup is replaced with `<Card>` / `<Button>` opportunistically in this phase — one pass only. Full uniformity comes in Phase 3.
- The current `globals.css` `--background` / `--foreground` variables are replaced by the new token system. The existing `prefers-color-scheme: dark` block is removed for Phase 1 — dark mode returns once tokens stabilize.

## Dependencies to add

```
@radix-ui/react-tabs
@radix-ui/react-dropdown-menu
@radix-ui/react-dialog
@radix-ui/react-tooltip
clsx
tailwind-merge
```

Pretendard is loaded via the official CDN stylesheet `@import` at the top of `globals.css` (before `@import "tailwindcss"` per CSS `@import` ordering rules), or via `@font-face`. No npm dep needed. The root `app/layout.tsx` body className keeps `bg-gray-50 text-gray-900` until tokens replace them; align it with the new `canvas`/`foreground` tokens.

## Verification

- **Unit (vitest):** `Button`, `Avatar`, `Badge` — variant/size props produce expected classes; accessibility attrs present (`aria-label`, `aria-pressed`).
- **Build & lint:** `npm run build` and `npm run lint` green.
- **Regression:** all 8 existing vitest tests pass.
- **Manual visual:** start dev server, exercise each `(app)` route at 360px / 800px / 1440px viewport widths. Confirm board list → post detail → /me → /admin chain works and looks correct. The `(auth)` routes (login/signup/onboarding/pending) are NOT restyled in Phase 1 — only verify they still load.

### Definition of Done

1. All `(app)` routes render inside the new shell across mobile / tablet / desktop without layout breakage.
2. The 10 `components/ui/` primitives are usable and documented via JSDoc.
3. `npm run build`, `npm run lint`, `npm run test` all green.
4. No regressions in existing flows: signup/login, post create/list/detail, comment, like, notification mark-read.
5. The new shell's chrome (TopBar / LeftRail / BottomNav) reflects the design tokens and shows active-route highlighting.

## Risks

- **Next.js 16 specifics:** AGENTS.md flags that this is not the Next.js training data knows. Implementation must read `node_modules/next/dist/docs/` for layout, route group, and metadata conventions before writing layout code.
- **RightRail slot pattern choice** is deliberately deferred to implementation. If both approaches turn out awkward, fall back to plain prop drilling — no need to invent a clever abstraction.
- **Pretendard CDN reliability** — if CDN proves flaky in production, switch to self-hosted font files.
