export type UserRole = 'pending' | 'member' | 'moderator' | 'admin' | 'banned'

export type ProfileLike = {
  role: UserRole
  timeout_until: string | null
}

export function isInTimeout(p: ProfileLike): boolean {
  if (!p.timeout_until) return false
  return new Date(p.timeout_until).getTime() > Date.now()
}

export function canPost(p: ProfileLike): boolean {
  if (p.role === 'pending' || p.role === 'banned') return false
  if (isInTimeout(p)) return false
  return ['member', 'moderator', 'admin'].includes(p.role)
}

export function canModerate(p: ProfileLike): boolean {
  return p.role === 'moderator' || p.role === 'admin'
}

export function canAdmin(p: ProfileLike): boolean {
  return p.role === 'admin'
}
