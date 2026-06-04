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
      <div className="sticky top-16 flex flex-col gap-2">{children}</div>
    </aside>
  )
}
