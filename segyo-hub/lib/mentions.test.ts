import { describe, it, expect } from 'vitest'
import {
  splitMentions,
  extractMentionIds,
  linkifyMentionsHtml,
  activeMentionQuery,
  filterMembers,
  type MentionMember,
} from './mentions'

const MEMBERS: MentionMember[] = [
  { id: 'u-admin', nickname: 'admin' },
  { id: 'u-test', nickname: '테스트' },
  { id: 'u-test2', nickname: '테스트2' },
  { id: 'u-none', nickname: null },
]

describe('splitMentions', () => {
  it('picks up a mention at the start of the text', () => {
    expect(splitMentions('@admin 안녕', MEMBERS)).toEqual([
      { type: 'mention', nickname: 'admin', id: 'u-admin' },
      { type: 'text', value: ' 안녕' },
    ])
  })

  it('prefers the longest nickname when one is a prefix of another', () => {
    expect(splitMentions('@테스트2 봐줘', MEMBERS)).toEqual([
      { type: 'mention', nickname: '테스트2', id: 'u-test2' },
      { type: 'text', value: ' 봐줘' },
    ])
  })

  it('leaves a trailing Korean particle as plain text', () => {
    expect(splitMentions('@테스트님 고마워', MEMBERS)).toEqual([
      { type: 'mention', nickname: '테스트', id: 'u-test' },
      { type: 'text', value: '님 고마워' },
    ])
  })

  it('ignores an @ that is not preceded by whitespace (emails)', () => {
    expect(splitMentions('kim@admin.com 으로', MEMBERS)).toEqual([
      { type: 'text', value: 'kim@admin.com 으로' },
    ])
  })

  it('ignores unknown nicknames', () => {
    expect(splitMentions('@nobody 있나요', MEMBERS)).toEqual([
      { type: 'text', value: '@nobody 있나요' },
    ])
  })

  it('handles a mention in the middle and at the end', () => {
    expect(splitMentions('cc @admin', MEMBERS)).toEqual([
      { type: 'text', value: 'cc ' },
      { type: 'mention', nickname: 'admin', id: 'u-admin' },
    ])
  })
})

describe('extractMentionIds', () => {
  it('dedupes repeated mentions', () => {
    expect(extractMentionIds('@admin @테스트 @admin', MEMBERS)).toEqual([
      'u-admin',
      'u-test',
    ])
  })

  it('returns nothing when there are no mentions', () => {
    expect(extractMentionIds('그냥 글이에요', MEMBERS)).toEqual([])
  })
})

describe('activeMentionQuery', () => {
  it('returns the query while typing after @', () => {
    const text = '안녕 @te'
    expect(activeMentionQuery(text, text.length)).toEqual({ query: 'te', start: 3 })
  })

  it('returns an empty query right after typing @', () => {
    expect(activeMentionQuery('@', 1)).toEqual({ query: '', start: 0 })
  })

  it('stops at whitespace', () => {
    const text = '@admin 님'
    expect(activeMentionQuery(text, text.length)).toBeNull()
  })

  it('ignores an @ that is part of an email', () => {
    const text = 'kim@ad'
    expect(activeMentionQuery(text, text.length)).toBeNull()
  })

  it('returns null when there is no @ before the caret', () => {
    expect(activeMentionQuery('그냥 글', 4)).toBeNull()
  })
})

describe('filterMembers', () => {
  it('puts prefix matches before substring matches', () => {
    const members: MentionMember[] = [
      { id: '1', nickname: '내테스트' },
      { id: '2', nickname: '테스트' },
    ]
    expect(filterMembers(members, '테스트').map((m) => m.id)).toEqual(['2', '1'])
  })

  it('is case insensitive and drops members without a nickname', () => {
    expect(filterMembers(MEMBERS, 'ADM').map((m) => m.nickname)).toEqual(['admin'])
  })

  it('returns every member for an empty query, capped by the limit', () => {
    expect(filterMembers(MEMBERS, '', 2)).toHaveLength(2)
  })
})

describe('linkifyMentionsHtml', () => {
  it('links mentions inside text nodes', () => {
    expect(linkifyMentionsHtml('<p>@admin 확인해줘</p>', MEMBERS)).toBe(
      '<p><a href="/u/u-admin" class="font-medium text-primary-600 hover:underline">@admin</a> 확인해줘</p>'
    )
  })

  it('treats the start of a text node as a boundary', () => {
    expect(linkifyMentionsHtml('<p><strong>@테스트</strong></p>', MEMBERS)).toBe(
      '<p><strong><a href="/u/u-test" class="font-medium text-primary-600 hover:underline">@테스트</a></strong></p>'
    )
  })

  it('leaves mentions inside attributes alone', () => {
    const html = '<a href="https://x.com/@admin">링크</a>'
    expect(linkifyMentionsHtml(html, MEMBERS)).toBe(html)
  })

  it('returns the html untouched when nothing matches', () => {
    expect(linkifyMentionsHtml('<p>안녕하세요</p>', MEMBERS)).toBe('<p>안녕하세요</p>')
  })
})
