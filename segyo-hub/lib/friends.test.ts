import { describe, it, expect } from 'vitest'
import { resolveFriendState, otherPartyId, type FriendshipRow } from './friends'

const ME = 'me-uuid'
const OTHER = 'other-uuid'

function row(partial: Partial<FriendshipRow>): FriendshipRow {
  return { id: 1, requester_id: ME, addressee_id: OTHER, status: 'pending', ...partial }
}

describe('resolveFriendState', () => {
  it('none when no row', () => {
    expect(resolveFriendState(null, ME)).toBe('none')
  })
  it('outgoing when I requested and still pending', () => {
    expect(resolveFriendState(row({ requester_id: ME, addressee_id: OTHER }), ME)).toBe('outgoing')
  })
  it('incoming when they requested me and still pending', () => {
    expect(resolveFriendState(row({ requester_id: OTHER, addressee_id: ME }), ME)).toBe('incoming')
  })
  it('friends when accepted regardless of direction', () => {
    expect(resolveFriendState(row({ status: 'accepted' }), ME)).toBe('friends')
    expect(
      resolveFriendState(row({ requester_id: OTHER, addressee_id: ME, status: 'accepted' }), ME),
    ).toBe('friends')
  })
})

describe('otherPartyId', () => {
  it('returns the counterpart from my perspective', () => {
    expect(otherPartyId(row({ requester_id: ME, addressee_id: OTHER }), ME)).toBe(OTHER)
    expect(otherPartyId(row({ requester_id: OTHER, addressee_id: ME }), ME)).toBe(OTHER)
  })
})
