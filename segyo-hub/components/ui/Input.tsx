import { cn } from '@/lib/cn'

/** Text input styled with design tokens and a primary focus ring. */
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
