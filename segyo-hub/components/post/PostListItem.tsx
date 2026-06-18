import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/time'

export type PostListItemProps = {
  id: number
  title: string
  authorNickname: string | null
  authorAvatarUrl?: string | null
  isAnonymous: boolean
  createdAt: string
  commentCount: number
  likeCount: number
  excerpt?: string
  thumbnailUrl?: string | null
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  )
}

export function PostListItem(props: PostListItemProps) {
  const author = props.isAnonymous ? '익명' : props.authorNickname ?? '(알 수 없음)'
  const avatarSrc = props.isAnonymous ? null : props.authorAvatarUrl ?? null

  return (
    <Link
      href={`/post/${props.id}`}
      className="group block rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      {/* Author + time */}
      <div className="flex items-center gap-2">
        <Avatar name={author} src={avatarSrc} size={32} />
        <span className="text-sm font-medium text-foreground">{author}</span>
        <span className="text-xs text-muted-fg">· {timeAgo(props.createdAt)}</span>
      </div>

      {/* Title + excerpt + thumbnail */}
      <div className="mt-2.5 flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 font-bold text-foreground transition-colors group-hover:text-primary-700">
            {props.title}
          </h3>
          {props.excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-fg">
              {props.excerpt}
            </p>
          ) : null}
        </div>
        {props.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.thumbnailUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : null}
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-fg">
        <span className="inline-flex items-center gap-1">
          <CommentIcon /> {props.commentCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <HeartIcon /> {props.likeCount}
        </span>
      </div>
    </Link>
  )
}
