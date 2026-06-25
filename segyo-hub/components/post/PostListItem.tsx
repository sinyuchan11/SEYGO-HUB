import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/time'
import { MessageIcon, HeartIcon } from '@/components/ui/icons'

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
          <MessageIcon size={14} /> {props.commentCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <HeartIcon size={14} /> {props.likeCount}
        </span>
      </div>
    </Link>
  )
}
