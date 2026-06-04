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
