import type { ReactNode } from 'react'
import Link from 'next/link'
import { timeAgo } from '@/lib/time'
import { Avatar } from '@/components/ui/Avatar'
import { splitMentions, type MentionMember } from '@/lib/mentions'

export type CommentNode = {
  id: number
  authorNickname: string | null
  authorAvatarUrl: string | null
  isAnonymous: boolean
  content: string
  createdAt: string
  parentId: number | null
  /** 내가 쓴 댓글인지 — 수정/삭제 메뉴 노출 판단용. */
  isMine: boolean
}

/** Render comment text with `@닉네임` turned into profile links. */
function CommentText({ text, members }: { text: string; members: MentionMember[] }) {
  return (
    <>
      {splitMentions(text, members).map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <Link
            key={i}
            href={`/u/${seg.id}`}
            className="font-medium text-primary-600 hover:underline"
          >
            @{seg.nickname}
          </Link>
        )
      )}
    </>
  )
}

export function CommentTree({
  comments,
  members = [],
  renderActions,
  editingId = null,
  renderEditor,
}: {
  comments: CommentNode[]
  members?: MentionMember[]
  renderActions?: (c: CommentNode) => ReactNode
  /** 수정 중인 댓글 id. 그 댓글은 본문 대신 renderEditor 를 보여준다. */
  editingId?: number | null
  renderEditor?: (c: CommentNode) => ReactNode
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
          <CommentBlock
            c={c}
            members={members}
            actions={renderActions?.(c)}
            editor={c.id === editingId ? renderEditor?.(c) : undefined}
          />
          {(repliesByParent.get(c.id) ?? []).length > 0 && (
            <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
              {(repliesByParent.get(c.id) ?? []).map((r) => (
                <li key={r.id}>
                  <CommentBlock
                    c={r}
                    members={members}
                    actions={renderActions?.(r)}
                    editor={r.id === editingId ? renderEditor?.(r) : undefined}
                    reply
                  />
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
  members,
  actions,
  editor,
  reply,
}: {
  c: CommentNode
  members: MentionMember[]
  actions?: ReactNode
  editor?: ReactNode
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
        {editor ? (
          <div className="mt-1">{editor}</div>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              <CommentText text={c.content} members={members} />
            </p>
            {actions && <div className="mt-2">{actions}</div>}
          </>
        )}
      </div>
    </div>
  )
}
