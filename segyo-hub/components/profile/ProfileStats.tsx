import { cn } from '@/lib/cn'

export function ProfileStats({
  postCount,
  likesReceived,
  className,
}: {
  postCount: number
  likesReceived: number
  className?: string
}) {
  return (
    <dl className={cn('flex gap-6', className)}>
      <div className="text-center">
        <dd className="text-lg font-bold text-foreground">{postCount}</dd>
        <dt className="text-xs text-muted-fg">게시글</dt>
      </div>
      <div className="text-center">
        <dd className="text-lg font-bold text-foreground">{likesReceived}</dd>
        <dt className="text-xs text-muted-fg">받은 좋아요</dt>
      </div>
    </dl>
  )
}
