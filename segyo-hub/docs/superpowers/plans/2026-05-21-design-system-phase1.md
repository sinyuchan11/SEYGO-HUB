# Design System Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain mobile-first chrome with a token-driven design system (`components/ui/`) and a responsive 4-zone app shell, without changing existing page behavior.

**Architecture:** Define purple-scale + neutral tokens in `globals.css` via Tailwind 4's `@theme`. Build 10 reusable primitives in `components/ui/` (plain React for visuals, Radix for behavior). Compose a 4-zone `AppShell` (TopBar / LeftRail / main / RightRail) used by `app/(app)/layout.tsx`, with breakpoint-driven visibility and the existing `BottomNav` reused on mobile.

**Tech Stack:** Next.js 16.2.6, React 19, Tailwind CSS 4, Radix Primitives, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-05-21-design-system-phase1-design.md`

**Next.js 16 note:** Per AGENTS.md, this Next.js differs from training data. Before writing layout code, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` and `route-groups.md`.

---

## File Structure

**Create:**
- `lib/cn.ts` — className merge helper (clsx + tailwind-merge)
- `vitest.setup.ts` — jest-dom matchers for component tests
- `components/ui/Button.tsx`, `IconButton.tsx`, `Card.tsx`, `Avatar.tsx`, `Badge.tsx`, `Input.tsx`
- `components/ui/Tabs.tsx`, `DropdownMenu.tsx`, `Dialog.tsx`, `Tooltip.tsx` (Radix wrappers)
- `components/ui/Button.test.tsx`, `Avatar.test.tsx`, `Badge.test.tsx`
- `components/layout/AppShell.tsx`, `TopBar.tsx`, `LeftRail.tsx`, `RightRail.tsx`

**Modify:**
- `app/globals.css` — replace with `@theme` token block + Pretendard
- `app/layout.tsx` — body className uses tokens
- `app/(app)/layout.tsx` — use `<AppShell>`, drop inline header
- `components/layout/BottomNav.tsx` — token restyle, add 글쓰기 tab
- `components/layout/NotificationBell.tsx` — token restyle (blue→primary)
- `vitest.config.ts` — register `setupFiles`
- `app/(app)/board/page.tsx`, `app/(app)/post/new/page.tsx`, `app/(app)/admin/users/page.tsx` — restyle page-level headers (blue→primary); keep them

---

## Task 1: Dependencies, cn helper, and test setup

**Files:**
- Modify: `package.json` (via npm install)
- Create: `lib/cn.ts`
- Create: `vitest.setup.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @radix-ui/react-tabs @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-tooltip clsx tailwind-merge
```
Expected: packages added to `dependencies`, no errors.

- [ ] **Step 2: Create the cn helper**

`lib/cn.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes, resolving conflicts (last wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Create the vitest setup file**

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Register the setup file in vitest config**

Modify `vitest.config.ts` — add `setupFiles` to the `test` block:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 5: Verify existing tests still pass with the setup file**

Run: `npm run test`
Expected: 8 tests pass (the existing `lib/permissions.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/cn.ts vitest.setup.ts vitest.config.ts
git commit -m "chore(ui): add radix+cn deps and jest-dom test setup"
```

---

## Task 2: Design tokens in globals.css

**Files:**
- Modify: `app/globals.css` (full replace)
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace globals.css with the token system**

Replace the entire contents of `app/globals.css`:
```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
@import "tailwindcss";

@theme {
  --color-primary-50: #f5f3ff;
  --color-primary-100: #ede9fe;
  --color-primary-200: #ddd6fe;
  --color-primary-300: #c4b5fd;
  --color-primary-400: #a78bfa;
  --color-primary-500: #8b5cf6;
  --color-primary-600: #7c3aed;
  --color-primary-700: #6d28d9;
  --color-primary-800: #5b21b6;
  --color-primary-900: #4c1d95;

  --color-surface: #ffffff;
  --color-canvas: #f9fafb;
  --color-muted: #f3f4f6;
  --color-border: #e5e7eb;
  --color-muted-fg: #6b7280;
  --color-foreground: #111827;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  --font-sans: 'Pretendard', system-ui, -apple-system, sans-serif;

  --radius-lg: 12px;
}

body {
  background: var(--color-canvas);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

Note: the old `--font-geist-sans` / `--font-geist-mono` vars are intentionally gone (they were never defined by a `next/font` setup, so referencing them would invalidate `font-family`). The `prefers-color-scheme: dark` block is also removed for Phase 1.

- [ ] **Step 2: Align the root layout body with tokens**

Modify `app/layout.tsx` — change the body className:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-canvas text-foreground">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Verify the build picks up the tokens**

Run: `npm run build`
Expected: build succeeds. (Token utility classes like `bg-canvas` compile because they derive from `@theme` color vars.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): add design tokens (purple scale, neutrals, Pretendard)"
```

---

## Task 3: Button component (TDD)

**Files:**
- Test: `components/ui/Button.test.tsx`
- Create: `components/ui/Button.tsx`

- [ ] **Step 1: Write the failing test**

`components/ui/Button.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders the primary variant by default', () => {
    render(<Button>저장</Button>)
    expect(screen.getByRole('button', { name: '저장' })).toHaveClass('bg-primary-600')
  })

  it('applies the danger variant', () => {
    render(<Button variant="danger">삭제</Button>)
    expect(screen.getByRole('button', { name: '삭제' })).toHaveClass('bg-danger')
  })

  it('applies the sm size height', () => {
    render(<Button size="sm">x</Button>)
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass('h-8')
  })

  it('forwards extra className', () => {
    render(<Button className="w-full">전송</Button>)
    expect(screen.getByRole('button', { name: '전송' })).toHaveClass('w-full')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: FAIL — cannot resolve `./Button`.

- [ ] **Step 3: Implement Button**

`components/ui/Button.tsx`:
```tsx
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-muted text-foreground hover:bg-border',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-danger text-white hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx components/ui/Button.test.tsx
git commit -m "feat(ui): add Button primitive"
```

---

## Task 4: Avatar component (TDD)

**Files:**
- Test: `components/ui/Avatar.test.tsx`
- Create: `components/ui/Avatar.tsx`

- [ ] **Step 1: Write the failing test**

`components/ui/Avatar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('shows the initial when no image is given', () => {
    render(<Avatar name="홍길동" />)
    expect(screen.getByText('홍')).toBeInTheDocument()
  })

  it('shows ? when name is empty', () => {
    render(<Avatar name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders an img when src is provided', () => {
    render(<Avatar name="홍길동" src="/a.png" />)
    expect(screen.getByRole('img', { name: '홍길동' })).toBeInTheDocument()
  })

  it('applies the size class', () => {
    const { container } = render(<Avatar name="홍" size={64} />)
    expect(container.firstChild).toHaveClass('h-16')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/ui/Avatar.test.tsx`
Expected: FAIL — cannot resolve `./Avatar`.

- [ ] **Step 3: Implement Avatar**

`components/ui/Avatar.tsx`:
```tsx
import { cn } from '@/lib/cn'

const sizeMap: Record<number, string> = {
  24: 'h-6 w-6 text-[10px]',
  32: 'h-8 w-8 text-xs',
  40: 'h-10 w-10 text-sm',
  64: 'h-16 w-16 text-xl',
}

export interface AvatarProps {
  name: string
  src?: string | null
  size?: 24 | 32 | 40 | 64
  className?: string
}

export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  const initial = name.trim().charAt(0) || '?'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700',
        sizeMap[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/ui/Avatar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ui/Avatar.tsx components/ui/Avatar.test.tsx
git commit -m "feat(ui): add Avatar primitive"
```

---

## Task 5: Badge component (TDD)

**Files:**
- Test: `components/ui/Badge.test.tsx`
- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Write the failing test**

`components/ui/Badge.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders the neutral tone by default', () => {
    render(<Badge>새 글</Badge>)
    expect(screen.getByText('새 글')).toHaveClass('bg-muted')
  })

  it('applies the primary tone', () => {
    render(<Badge tone="primary">12</Badge>)
    expect(screen.getByText('12')).toHaveClass('bg-primary-100')
  })

  it('applies the danger tone', () => {
    render(<Badge tone="danger">9+</Badge>)
    expect(screen.getByText('9+')).toHaveClass('bg-danger')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/ui/Badge.test.tsx`
Expected: FAIL — cannot resolve `./Badge`.

- [ ] **Step 3: Implement Badge**

`components/ui/Badge.tsx`:
```tsx
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'primary' | 'danger' | 'success'

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-fg',
  primary: 'bg-primary-100 text-primary-700',
  danger: 'bg-danger text-white',
  success: 'bg-success text-white',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/ui/Badge.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ui/Badge.tsx components/ui/Badge.test.tsx
git commit -m "feat(ui): add Badge primitive"
```

---

## Task 6: IconButton, Card, Input (plain primitives)

**Files:**
- Create: `components/ui/IconButton.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Input.tsx`

- [ ] **Step 1: Implement IconButton**

`components/ui/IconButton.tsx`:
```tsx
import { cn } from '@/lib/cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — describes the action. */
  'aria-label': string
}

export function IconButton({ className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Implement Card**

`components/ui/Card.tsx`:
```tsx
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface', className)}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Implement Input**

`components/ui/Input.tsx`:
```tsx
import { cn } from '@/lib/cn'

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-fg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100',
      className,
    )}
    {...props}
  />
)
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/ui/IconButton.tsx components/ui/Card.tsx components/ui/Input.tsx
git commit -m "feat(ui): add IconButton, Card, Input primitives"
```

---

## Task 7: Radix wrapper components

**Files:**
- Create: `components/ui/Tabs.tsx`
- Create: `components/ui/DropdownMenu.tsx`
- Create: `components/ui/Dialog.tsx`
- Create: `components/ui/Tooltip.tsx`

- [ ] **Step 1: Implement Tabs**

`components/ui/Tabs.tsx`:
```tsx
'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 border-b border-border', className)}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:text-foreground data-[state=active]:border-primary-600 data-[state=active]:text-primary-700',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
```

- [ ] **Step 2: Implement DropdownMenu**

`components/ui/DropdownMenu.tsx`:
```tsx
'use client'

import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'cursor-pointer rounded-md px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Implement Dialog**

`components/ui/Dialog.tsx`:
```tsx
'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-5 shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description
```

- [ ] **Step 4: Implement Tooltip**

`components/ui/Tooltip.tsx`:
```tsx
'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  label,
  children,
  side = 'right',
}: {
  label: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 rounded-md bg-foreground px-2 py-1 text-xs text-white shadow-md',
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (Radix imports resolve).

- [ ] **Step 6: Commit**

```bash
git add components/ui/Tabs.tsx components/ui/DropdownMenu.tsx components/ui/Dialog.tsx components/ui/Tooltip.tsx
git commit -m "feat(ui): add Radix wrappers (Tabs, DropdownMenu, Dialog, Tooltip)"
```

---

## Task 8: TopBar

**Files:**
- Create: `components/layout/TopBar.tsx`

- [ ] **Step 1: Implement TopBar**

`components/layout/TopBar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { NotificationBell } from './NotificationBell'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/DropdownMenu'

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-primary-600 px-4 text-white">
      <Link href="/" className="text-lg font-bold">
        Segyo Hub
      </Link>

      <div className="hidden flex-1 md:block">
        <Input
          placeholder="검색…"
          className="border-transparent bg-white/15 text-white placeholder:text-white/70 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="내 메뉴" className="outline-none">
            <Avatar name="나" size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href="/me">내 정보</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/board">게시판</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
```

Note: the search field is hidden below `md` (mobile), matching the spec. The bell and avatar menu remain on all widths.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/TopBar.tsx
git commit -m "feat(layout): add TopBar with search, bell, avatar menu"
```

---

## Task 9: LeftRail

**Files:**
- Create: `components/layout/LeftRail.tsx`

- [ ] **Step 1: Implement LeftRail**

`components/layout/LeftRail.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { TooltipProvider, Tooltip } from '@/components/ui/Tooltip'

const items = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/board', label: '게시판', icon: '📝' },
  { href: '/post/new', label: '글쓰기', icon: '✏️' },
  { href: '/me', label: '내 정보', icon: '👤' },
] as const

export function LeftRail() {
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="hidden shrink-0 py-2 md:block">
        <ul className="sticky top-20 flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface py-3">
          {items.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Tooltip label={item.label}>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors',
                      active
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-muted-fg hover:bg-muted',
                    )}
                  >
                    {item.icon}
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

Note: `hidden md:block` — LeftRail is absent on mobile, present on tablet + desktop, per spec.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/LeftRail.tsx
git commit -m "feat(layout): add LeftRail icon navigation"
```

---

## Task 10: RightRail

**Files:**
- Create: `components/layout/RightRail.tsx`

- [ ] **Step 1: Implement RightRail**

`components/layout/RightRail.tsx`:
```tsx
import { cn } from '@/lib/cn'

/**
 * Desktop-only context sidebar. Pages inject widgets via children in later
 * phases; for Phase 1 the slot is typically empty (AppShell omits it when
 * no children are passed).
 */
export function RightRail({
  children,
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <aside className={cn('hidden w-[280px] shrink-0 py-2 xl:block', className)}>
      <div className="sticky top-20 flex flex-col gap-2">{children}</div>
    </aside>
  )
}
```

Note: `hidden xl:block` — RightRail only appears at desktop (≥1280px), per spec.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/RightRail.tsx
git commit -m "feat(layout): add RightRail desktop context slot"
```

---

## Task 11: Restyle BottomNav and NotificationBell

**Files:**
- Modify: `components/layout/BottomNav.tsx`
- Modify: `components/layout/NotificationBell.tsx`

- [ ] **Step 1: Restyle BottomNav with tokens and add 글쓰기**

Replace `components/layout/BottomNav.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const tabs = [
  { href: '/', label: '홈' },
  { href: '/board', label: '게시판' },
  { href: '/post/new', label: '글쓰기' },
  { href: '/me', label: '내정보' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface md:hidden">
      {tabs.map((t) => {
        const active =
          t.href === '/'
            ? pathname === '/'
            : pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'py-3 text-center text-sm',
              active ? 'font-bold text-primary-600' : 'text-muted-fg',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

Note: added `md:hidden` so BottomNav only shows on mobile (LeftRail covers tablet+desktop). Active-route logic now special-cases `/` so it isn't always active.

- [ ] **Step 2: Restyle NotificationBell to tokens (blue→primary, red→danger)**

In `components/layout/NotificationBell.tsx`, replace the brand/utility colors:
- `bg-red-600` → `bg-danger` (the unread count badge)
- `text-blue-600` → `text-primary-600` (the "모두 읽음" button)
- `bg-blue-50` → `bg-primary-50` (unread list item background)

The exact edits:
```tsx
// unread badge span:
className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] text-white"

// "모두 읽음" button:
<button onClick={markRead} className="text-xs text-primary-600">

// unread list item:
className={`cursor-pointer border-b px-3 py-2 text-sm ${
  n.read_at === null ? 'bg-primary-50' : ''
}`}
```

Leave all behavior (polling, mark-read, routing) unchanged.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/layout/BottomNav.tsx components/layout/NotificationBell.tsx
git commit -m "feat(layout): restyle BottomNav and NotificationBell to tokens"
```

---

## Task 12: AppShell, wire layout, restyle page headers, final verify

**Files:**
- Create: `components/layout/AppShell.tsx`
- Modify: `app/(app)/layout.tsx`
- Modify: `app/(app)/board/page.tsx`
- Modify: `app/(app)/post/new/page.tsx`
- Modify: `app/(app)/admin/users/page.tsx`

- [ ] **Step 1: Implement AppShell**

`components/layout/AppShell.tsx`:
```tsx
import { TopBar } from './TopBar'
import { LeftRail } from './LeftRail'
import { RightRail } from './RightRail'
import { BottomNav } from './BottomNav'

export function AppShell({
  children,
  rightRail,
}: {
  children: React.ReactNode
  rightRail?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopBar />
      <div className="mx-auto flex max-w-[1400px] gap-2 px-2 pb-20 md:pb-2">
        <LeftRail />
        <main className="min-w-0 flex-1 py-2">{children}</main>
        {rightRail ? <RightRail>{rightRail}</RightRail> : null}
      </div>
      <BottomNav />
    </div>
  )
}
```

Note: `pb-20` reserves space for the fixed mobile BottomNav; `md:pb-2` removes it once BottomNav is hidden. RightRail is only rendered when a page provides `rightRail` (none do in Phase 1).

- [ ] **Step 2: Wire AppShell into the route-group layout**

Replace `app/(app)/layout.tsx`:
```tsx
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

The old inline `<header>Segyo Hub</header>` and the standalone `<BottomNav />` / `<NotificationBell />` mounts are gone — AppShell owns them now.

- [ ] **Step 3: Restyle the board page header (keep it — it's page content)**

In `app/(app)/board/page.tsx`, update the header block's button color (blue→primary). Replace:
```tsx
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <h2 className="font-bold">자유 게시판</h2>
        <Link href="/post/new" className="rounded-lg bg-primary-600 px-3 py-1 text-sm text-white">
          새 글
        </Link>
      </div>
```

- [ ] **Step 4: Restyle the new-post page header (keep it)**

In `app/(app)/post/new/page.tsx`, the header is `<header className="border-b bg-white px-4 py-3 font-bold">새 글</header>`. Update to tokens:
```tsx
      <header className="border-b border-border bg-surface px-4 py-3 font-bold">새 글</header>
```
Do not delete it — it is the page's section title, not app chrome.

- [ ] **Step 5: Restyle the admin page header (keep it)**

In `app/(app)/admin/users/page.tsx`, the header is `<header className="border-b bg-white px-4 py-3">`. Update to tokens:
```tsx
      <header className="border-b border-border bg-surface px-4 py-3">
```
Keep its inner content unchanged.

- [ ] **Step 6: Full verification**

Run each and confirm:
```bash
npm run lint
npm run test
npm run build
```
Expected: lint clean, all tests pass (8 existing + Button 4 + Avatar 4 + Badge 3 = 19), build succeeds.

- [ ] **Step 7: Manual visual check**

Run: `npm run dev`
In a browser, check these at viewport widths 360px, 800px, 1440px:
- `/board` — TopBar purple, LeftRail visible ≥768px, BottomNav visible <768px, post list renders.
- `/post/[id]` (open any post) — renders inside shell, comments/likes work.
- `/me` — renders inside shell.
- `/admin/users` — renders inside shell.
- Confirm `(auth)` routes (`/login`, `/signup`) still load (they are NOT inside the shell and are not restyled in Phase 1).

Expected: no layout breakage at any width; existing flows (post, comment, like, notification mark-read) still work.

- [ ] **Step 8: Commit**

```bash
git add components/layout/AppShell.tsx "app/(app)/layout.tsx" "app/(app)/board/page.tsx" "app/(app)/post/new/page.tsx" "app/(app)/admin/users/page.tsx"
git commit -m "feat(layout): wire AppShell into (app) routes and restyle page headers"
```

---

## Self-Review Notes

- **Spec coverage:** tokens (Task 2), 10 primitives (Tasks 3–7), 4-zone shell + breakpoints (Tasks 8–12), BottomNav reuse (Task 11), migration/header rules (Task 12), verification + DoD (Task 12 steps 6–7). Out-of-scope items (cover, follow, badges, dense feed) are correctly absent.
- **Font-stack risk** from the spec is handled in Task 2 step 1 (Geist vars removed).
- **Header ambiguity** from the spec is handled in Task 12 (page headers restyled, not deleted; only the layout app-chrome header removed).
- **Type consistency:** component prop names (`variant`/`size`/`tone`/`name`/`src`) are used consistently across tasks; `cn` signature matches all call sites.
