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

/** 목록(리스트) 뷰용 한 줄 항목. 카드 뷰의 PostListItem 과 같은 데이터를 받는다. */
export function PostListRow(props: PostListItemProps) {
  const author = props.isAnonymous ? '익명' : props.authorNickname ?? '(알 수 없음)'

  return (
    <Link
      href={`/post/${props.id}`}
      className="group flex items-center gap-3 border-b border-border px-1 py-2.5 transition-colors last:border-0 hover:bg-muted"
    >
      <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary-700">
        {props.title}
      </h3>
      <span className="shrink-0 text-xs text-muted-fg">{author}</span>
      <span className="shrink-0 text-xs text-muted-fg">{timeAgo(props.createdAt)}</span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-fg">
        <MessageIcon size={13} /> {props.commentCount}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-fg">
        <HeartIcon size={13} /> {props.likeCount}
      </span>
    </Link>
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
          <MessageIcon size={14} /> {props.commentCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <HeartIcon size={14} /> {props.likeCount}
        </span>
      </div>
    </Link>
  )
}
