import type { ReactNode } from 'react'

export type CommentNode = {
  id: number
  authorNickname: string | null
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
    <ul className="divide-y bg-white">
      {tops.map((c) => (
        <li key={c.id} className="px-4 py-3">
          <CommentBlock c={c} actions={renderActions?.(c)} />
          <ul className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
            {(repliesByParent.get(c.id) ?? []).map((r) => (
              <li key={r.id}>
                <CommentBlock c={r} actions={renderActions?.(r)} reply />
              </li>
            ))}
          </ul>
        </li>
      ))}
      {tops.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-gray-500">
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
  const author = c.isAnonymous ? '익명' : (c.authorNickname ?? '(알 수 없음)')
  return (
    <div>
      <div className="flex gap-2 text-xs text-gray-500">
        {reply && <span>↳</span>}
        <span className="font-medium text-gray-700">{author}</span>
        <span>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
      {actions && <div className="mt-1">{actions}</div>}
    </div>
  )
}
