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
