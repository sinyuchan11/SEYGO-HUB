// 멘션은 평문 `@닉네임`으로 저장된다. 자동완성으로 넣든 직접 타이핑하든 형태가 같아서
// 글 본문(HTML)과 댓글(평문)이 이 파서 하나를 공유한다.

export type MentionMember = { id: string; nickname: string | null }

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; nickname: string; id: string }

/** `@`는 문자열 시작이거나 공백/여는 태그 다음이어야 한다 (이메일 a@b.com 오탐 방지). */
function isBoundary(prev: string | undefined): boolean {
  if (prev === undefined) return true
  return /\s/.test(prev) || prev === '>'
}

/** 긴 닉네임부터 시도해야 `@테스트`와 `@테스트2`가 공존해도 최장일치가 된다. */
function byLengthDesc(members: MentionMember[]): { nickname: string; id: string }[] {
  return members
    .filter((m): m is { id: string; nickname: string } => !!m.nickname)
    .map((m) => ({ nickname: m.nickname, id: m.id }))
    .sort((a, b) => b.nickname.length - a.nickname.length)
}

/**
 * Split plain text into literal and mention segments.
 * Matches against the real nickname list (longest first) rather than a `@\w+`
 * regex, because nicknames have no format constraint and Korean particles
 * attach directly to the name (`@테스트님` → mention `테스트` + text `님`).
 */
export function splitMentions(text: string, members: MentionMember[]): MentionSegment[] {
  const candidates = byLengthDesc(members)
  const out: MentionSegment[] = []
  let buf = ''
  let i = 0

  while (i < text.length) {
    if (text[i] === '@' && isBoundary(text[i - 1])) {
      const rest = text.slice(i + 1)
      const hit = candidates.find((c) => rest.startsWith(c.nickname))
      if (hit) {
        if (buf) {
          out.push({ type: 'text', value: buf })
          buf = ''
        }
        out.push({ type: 'mention', nickname: hit.nickname, id: hit.id })
        i += 1 + hit.nickname.length
        continue
      }
    }
    buf += text[i]
    i += 1
  }

  if (buf) out.push({ type: 'text', value: buf })
  return out
}

/** Distinct member ids mentioned in the text. */
export function extractMentionIds(text: string, members: MentionMember[]): string[] {
  const seen = new Set<string>()
  for (const seg of splitMentions(text, members)) {
    if (seg.type === 'mention') seen.add(seg.id)
  }
  return [...seen]
}

const MAX_QUERY_LEN = 30

/** Longest `@query` the caret is currently sitting in, for the autocomplete. */
export function activeMentionQuery(
  text: string,
  caret: number
): { query: string; start: number } | null {
  for (let i = caret - 1; i >= 0 && caret - i <= MAX_QUERY_LEN + 1; i -= 1) {
    const ch = text[i]
    if (ch === '@') {
      if (!isBoundary(text[i - 1])) return null
      return { query: text.slice(i + 1, caret), start: i }
    }
    // 닉네임에 공백이 있을 수 있지만, 공백까지 쫓으면 문장 전체가 질의가 된다.
    if (/\s/.test(ch)) return null
  }
  return null
}

/** Members whose nickname contains the query, shortest (closest) first. */
export function filterMembers(
  members: MentionMember[],
  query: string,
  limit = 5
): { id: string; nickname: string }[] {
  const q = query.toLowerCase()
  return members
    .filter((m): m is { id: string; nickname: string } => !!m.nickname)
    .filter((m) => m.nickname.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.nickname.toLowerCase().startsWith(q)
      const bStarts = b.nickname.toLowerCase().startsWith(q)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.nickname.length - b.nickname.length
    })
    .slice(0, limit)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap mentions in already-sanitized HTML with profile links.
 * Only the text between tags is rewritten, so mentions inside attributes
 * (hrefs, alt text) are left alone.
 */
export function linkifyMentionsHtml(html: string, members: MentionMember[]): string {
  // 닉네임도 HTML 이스케이프한 형태로 비교해야 정제된 본문과 맞물린다.
  const escaped = members
    .filter((m) => m.nickname)
    .map((m) => ({ id: m.id, nickname: escapeHtml(m.nickname as string) }))

  return html
    .split(/(<[^>]*>)/g)
    .map((chunk) => {
      if (chunk.startsWith('<')) return chunk
      return splitMentions(chunk, escaped)
        .map((seg) =>
          seg.type === 'text'
            ? seg.value
            : `<a href="/u/${encodeURIComponent(seg.id)}" class="font-medium text-primary-600 hover:underline">@${seg.nickname}</a>`
        )
        .join('')
    })
    .join('')
}
