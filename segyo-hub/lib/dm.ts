export type ConversationUnreadInput = {
  lastMessageAt: string
  lastReadAt: string | null
  lastSenderId: string | null
}

/**
 * A conversation is unread when its latest message came from the other party
 * and is newer than my last read time.
 */
export function isConversationUnread(c: ConversationUnreadInput, myId: string): boolean {
  if (!c.lastSenderId || c.lastSenderId === myId) return false
  if (!c.lastReadAt) return true
  return new Date(c.lastMessageAt).getTime() > new Date(c.lastReadAt).getTime()
}
