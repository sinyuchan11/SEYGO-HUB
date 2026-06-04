export const MAX_INTERESTS = 5
export const MAX_INTEREST_LEN = 20
export const MAX_BIO_LEN = 500
export const MAX_TAGLINE_LEN = 80

export type ProfileWithStats = {
  id: string
  nickname: string | null
  role: string
  grade_class: string | null
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  tagline: string | null
  interests: string[]
  created_at: string
  post_count: number
  likes_received: number
}

/** Trim, drop empties, truncate each to MAX_INTEREST_LEN, dedupe, cap to MAX_INTERESTS. */
export function normalizeInterests(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = item.trim().slice(0, MAX_INTEREST_LEN)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
    if (out.length >= MAX_INTERESTS) break
  }
  return out
}

export function isValidBio(s: string | null): boolean {
  return s === null || s.length <= MAX_BIO_LEN
}

export function isValidTagline(s: string | null): boolean {
  return s === null || s.length <= MAX_TAGLINE_LEN
}

/** Coerce a raw RPC row (bigint stats arrive as strings/numbers) into ProfileWithStats. */
export function coerceProfile(row: Record<string, unknown>): ProfileWithStats {
  return {
    ...(row as ProfileWithStats),
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    post_count: Number(row.post_count ?? 0),
    likes_received: Number(row.likes_received ?? 0),
  }
}
