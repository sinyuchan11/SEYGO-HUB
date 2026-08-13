'use client'

import { Avatar } from '@/components/ui/Avatar'

export type MentionCandidate = { id: string; nickname: string }

/**
 * Dropdown of nickname candidates for the `@` autocomplete.
 * Purely presentational — the caller owns the query, the active index and the
 * insertion, so the same list works for the comment input and the editor.
 */
export function MentionSuggestions({
  items,
  activeIndex,
  onPick,
  className,
  style,
}: {
  items: MentionCandidate[]
  activeIndex: number
  onPick: (item: MentionCandidate) => void
  className?: string
  style?: React.CSSProperties
}) {
  if (items.length === 0) return null

  return (
    <ul
      role="listbox"
      aria-label="멘션할 사용자"
      style={style}
      className={
        'absolute z-30 max-h-56 w-56 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg ' +
        (className ?? '')
      }
    >
      {items.map((item, i) => (
        <li key={item.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            // 입력창이 blur되면 목록이 닫히므로 mousedown에서 처리한다.
            onMouseDown={(e) => {
              e.preventDefault()
              onPick(item)
            }}
            className={
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm ' +
              (i === activeIndex ? 'bg-muted text-foreground' : 'text-muted-fg hover:bg-muted')
            }
          >
            <Avatar name={item.nickname} src={null} size={24} className="shrink-0" />
            <span className="truncate">{item.nickname}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
