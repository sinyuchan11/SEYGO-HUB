export type NotifKind =
  | 'comment_on_post'
  | 'reply_on_comment'
  | 'profanity_evasion'
  | 'friend_request'
  | 'friend_accept'

export type NotifPayload = {
  post_id?: number
  comment_id?: number
  parent_comment_id?: number
  actor_id?: string
  friendship_id?: number
}

export const NOTIF_LABELS: Record<NotifKind, string> = {
  comment_on_post: '내 글에 새 댓글이 달렸어요',
  reply_on_comment: '내 댓글에 답글이 달렸어요',
  profanity_evasion: '비속어 우회가 의심되는 글이 등록됐어요',
  friend_request: '새 친구 요청이 왔어요',
  friend_accept: '친구 요청이 수락됐어요',
}

/** Where a notification should navigate when tapped. */
export function notificationHref(kind: NotifKind, payload: NotifPayload): string {
  if (kind === 'friend_request' || kind === 'friend_accept') return '/friends'
  if (payload?.post_id) return `/post/${payload.post_id}`
  return '/notifications'
}
