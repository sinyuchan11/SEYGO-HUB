import { describe, it, expect } from 'vitest'
import { canPost, canModerate, canAdmin, isInTimeout } from './permissions'

describe('permissions', () => {
  it('pending cannot post', () => {
    expect(canPost({ role: 'pending', timeout_until: null })).toBe(false)
  })

  it('member can post', () => {
    expect(canPost({ role: 'member', timeout_until: null })).toBe(true)
  })

  it('member in timeout cannot post', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(canPost({ role: 'member', timeout_until: future })).toBe(false)
  })

  it('member with expired timeout can post', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(canPost({ role: 'member', timeout_until: past })).toBe(true)
  })

  it('banned cannot post', () => {
    expect(canPost({ role: 'banned', timeout_until: null })).toBe(false)
  })

  it('moderator can moderate, member cannot', () => {
    expect(canModerate({ role: 'moderator', timeout_until: null })).toBe(true)
    expect(canModerate({ role: 'member', timeout_until: null })).toBe(false)
  })

  it('only admin can admin', () => {
    expect(canAdmin({ role: 'admin', timeout_until: null })).toBe(true)
    expect(canAdmin({ role: 'moderator', timeout_until: null })).toBe(false)
  })

  it('isInTimeout reflects timeout_until', () => {
    expect(isInTimeout({ role: 'member', timeout_until: null })).toBe(false)
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isInTimeout({ role: 'member', timeout_until: future })).toBe(true)
  })
})
