import { describe, it, expect } from 'vitest'
import { isConversationUnread } from './dm'

const ME = 'me'
const OTHER = 'other'
const now = '2026-07-30T10:00:00Z'
const earlier = '2026-07-30T09:00:00Z'

describe('isConversationUnread', () => {
  it('not unread when there is no message sender', () => {
    expect(isConversationUnread({ lastMessageAt: now, lastReadAt: null, lastSenderId: null }, ME)).toBe(false)
  })
  it('not unread when the last message is mine', () => {
    expect(isConversationUnread({ lastMessageAt: now, lastReadAt: earlier, lastSenderId: ME }, ME)).toBe(false)
  })
  it('unread when other sent and I never read', () => {
    expect(isConversationUnread({ lastMessageAt: now, lastReadAt: null, lastSenderId: OTHER }, ME)).toBe(true)
  })
  it('unread when other message is newer than my last read', () => {
    expect(isConversationUnread({ lastMessageAt: now, lastReadAt: earlier, lastSenderId: OTHER }, ME)).toBe(true)
  })
  it('read when I already read past the last message', () => {
    expect(isConversationUnread({ lastMessageAt: earlier, lastReadAt: now, lastSenderId: OTHER }, ME)).toBe(false)
  })
})
