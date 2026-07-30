export type FriendState = 'none' | 'outgoing' | 'incoming' | 'friends'

export type FriendshipRow = {
  id: number
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
}

/**
 * Given the friendship row between me and another user (or null if none),
 * resolve how the relationship looks from my point of view.
 */
export function resolveFriendState(row: FriendshipRow | null, myId: string): FriendState {
  if (!row) return 'none'
  if (row.status === 'accepted') return 'friends'
  return row.requester_id === myId ? 'outgoing' : 'incoming'
}

/** The other party's id in a friendship, relative to me. */
export function otherPartyId(row: FriendshipRow, myId: string): string {
  return row.requester_id === myId ? row.addressee_id : row.requester_id
}
