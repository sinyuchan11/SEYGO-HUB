import { describe, it, expect } from 'vitest'
import { buildCheckText } from './profanity'

describe('buildCheckText', () => {
  it('combines title and stripped body', () => {
    expect(buildCheckText('제목', '<p>본문 내용</p>')).toBe('제목 본문 내용')
  })

  it('strips nested HTML tags and collapses whitespace', () => {
    expect(buildCheckText('t', '<div><strong>a</strong>   <em>b</em></div>')).toBe('t a b')
  })

  it('decodes common HTML entities', () => {
    expect(buildCheckText('', '<p>a&amp;b&nbsp;c</p>')).toBe('a&b c')
  })

  it('handles empty title', () => {
    expect(buildCheckText('', '<p>hello</p>')).toBe('hello')
  })

  it('handles empty body', () => {
    expect(buildCheckText('제목', '')).toBe('제목')
  })

  it('trims surrounding whitespace', () => {
    expect(buildCheckText('  t  ', '<p>  body  </p>')).toBe('t body')
  })
})
