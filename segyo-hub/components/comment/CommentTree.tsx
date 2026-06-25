import type { ReactNode } from 'react'
import { timeAgo } from '@/lib/time'
import { Avatar } from '@/components/ui/Avatar'

export type CommentNode = {
  id: number
  authorNickname: string | null
  authorAvatarUrl: string | null
  isAnonymous: boolean
  content: string
  createdAt: string
  parentId: number | null
}

export function CommentTree({
  comments,
  renderActions,
}: {
  comments: CommentNode[]
  renderActions?: (c: CommentNode) => ReactNode
}) {
  const tops = comments.filter((c) => c.parentId === null)
  const repliesByParent = new Map<number, CommentNode[]>()
  for (const c of comments) {
    if (c.parentId !== null) {
      const arr = repliesByParent.get(c.parentId) ?? []
      arr.push(c)
      repliesByParent.set(c.parentId, arr)
    }
  }

  return (
    <ul className="divide-y divide-border bg-surface">
      {tops.map((c) => (
        <li key={c.id} className="px-4 py-4">
          <CommentBlock c={c} actions={renderActions?.(c)} />
          {(repliesByParent.get(c.id) ?? []).length > 0 && (
            <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
              {(repliesByParent.get(c.id) ?? []).map((r) => (
                <li key={r.id}>
                  <CommentBlock c={r} actions={renderActions?.(r)} reply />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
      {tops.length === 0 && (
        <li className="px-4 py-8 text-center text-sm text-muted-fg">
          첫 댓글을 남겨보세요.
        </li>
      )}
    </ul>
  )
}

function CommentBlock({
  c,
  actions,
  reply,
}: {
  c: CommentNode
  actions?: ReactNode
  reply?: boolean
}) {
  const isAnon = c.isAnonymous
  const author = isAnon ? '익명' : (c.authorNickname ?? '(알 수 없음)')
  const avatarSrc = isAnon ? null : c.authorAvatarUrl

  return (
    <div className="flex gap-3">
      <Avatar name={author} src={avatarSrc} size={32} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{author}</span>
          <span
            className="text-xs text-muted-fg"
            suppressHydrationWarning
          >
            {timeAgo(c.createdAt)}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{c.content}</p>
        {actions && <div className="mt-2">{actions}</div>}
      </div>
    </div>
  )
}
