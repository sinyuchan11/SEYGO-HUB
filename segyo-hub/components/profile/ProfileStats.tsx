import Link from 'next/link'
import { cn } from '@/lib/cn'

export function ProfileStats({
  postCount,
  likesReceived,
  postsHref,
  className,
}: {
  postCount: number
  likesReceived: number
  /** 주면 '게시글'이 그 사람의 글 목록으로 가는 링크가 된다. */
  postsHref?: string
  className?: string
}) {
  const posts = (
    <>
      <dd className="text-lg font-bold text-foreground">{postCount}</dd>
      <dt className="text-xs text-muted-fg">게시글</dt>
    </>
  )

  return (
    <dl className={cn('flex gap-6', className)}>
      {postsHref ? (
        <Link
          href={postsHref}
          className="rounded-lg px-2 py-0.5 text-center transition-colors hover:bg-muted"
        >
          {posts}
        </Link>
      ) : (
        <div className="text-center">{posts}</div>
      )}
      <div className="text-center">
        <dd className="text-lg font-bold text-foreground">{likesReceived}</dd>
        <dt className="text-xs text-muted-fg">받은 좋아요</dt>
      </div>
    </dl>
  )
}
