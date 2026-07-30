import { describe, it, expect } from 'vitest'
import { parseBoard, boardHeading, boardEmptyText, BOARD_TABS } from './board'

describe('parseBoard', () => {
  it('accepts valid board keys', () => {
    expect(parseBoard('free')).toBe('free')
    expect(parseBoard('qna')).toBe('qna')
    expect(parseBoard('notice')).toBe('notice')
  })

  it('defaults to all for unknown/undefined/anon', () => {
    expect(parseBoard(undefined)).toBe('all')
    expect(parseBoard('')).toBe('all')
    expect(parseBoard('anon')).toBe('all')
    expect(parseBoard('garbage')).toBe('all')
  })
})

describe('boardHeading', () => {
  it('gives a distinct title per tab', () => {
    const titles = BOARD_TABS.map((t) => boardHeading(t.key).title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('all tab is generic', () => {
    expect(boardHeading('all').title).toBe('게시판')
  })
})

describe('boardEmptyText', () => {
  it('adapts to qna and notice', () => {
    expect(boardEmptyText('qna')).toContain('질문')
    expect(boardEmptyText('notice')).toContain('공지')
  })

  it('falls back for free/all', () => {
    expect(boardEmptyText('free')).toBe('아직 글이 없어요')
    expect(boardEmptyText('all')).toBe('아직 글이 없어요')
  })
})
