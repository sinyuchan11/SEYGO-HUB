import { cn } from '@/lib/cn'

/** Small red count bubble for nav icons. Renders nothing at zero. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={`읽지 않음 ${count}개`}
      className={cn(
        'grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-danger px-0.5 text-[10px] font-bold leading-none text-white',
        className
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
