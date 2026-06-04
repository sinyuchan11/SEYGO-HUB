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
