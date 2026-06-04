import { describe, it, expect } from 'vitest'
import {
  normalizeInterests, isValidBio, isValidTagline, coerceProfile,
  MAX_INTERESTS,
} from './profile'

describe('normalizeInterests', () => {
  it('trims and drops empty entries', () => {
    expect(normalizeInterests([' 게임 ', '  ', '음악'])).toEqual(['게임', '음악'])
  })
  it('dedupes', () => {
    expect(normalizeInterests(['게임', '게임'])).toEqual(['게임'])
  })
  it('caps at MAX_INTERESTS', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(normalizeInterests(many)).toHaveLength(MAX_INTERESTS)
  })
  it('truncates each tag to 20 chars', () => {
    const long = 'x'.repeat(30)
    expect(normalizeInterests([long])[0]).toHaveLength(20)
  })
})

describe('length validators', () => {
  it('isValidBio accepts <=500 and null', () => {
    expect(isValidBio(null)).toBe(true)
    expect(isValidBio('x'.repeat(500))).toBe(true)
    expect(isValidBio('x'.repeat(501))).toBe(false)
  })
  it('isValidTagline accepts <=80', () => {
    expect(isValidTagline('x'.repeat(80))).toBe(true)
    expect(isValidTagline('x'.repeat(81))).toBe(false)
  })
})

describe('coerceProfile', () => {
  it('numbers the bigint stats and defaults interests', () => {
    const p = coerceProfile({ id: 'u1', post_count: '3', likes_received: '7', interests: null })
    expect(p.post_count).toBe(3)
    expect(p.likes_received).toBe(7)
    expect(p.interests).toEqual([])
  })
})
