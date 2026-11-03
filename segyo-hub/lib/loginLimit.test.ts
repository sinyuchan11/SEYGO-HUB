import { describe, expect, it } from 'vitest'
import { MAX_FAILURES, WINDOW_MS, formatRetryAfter, loginLimitState, normalizeEmail } from './loginLimit'

const NOW = 1_800_000_000_000
const ago = (ms: number) => NOW - ms

describe('loginLimitState', () => {
  it('실패가 없으면 5번 남는다', () => {
    expect(loginLimitState([], NOW)).toEqual({ locked: false, remaining: MAX_FAILURES })
  })

  it('4번 틀리면 1번 남는다', () => {
    expect(loginLimitState([ago(1), ago(2), ago(3), ago(4)], NOW)).toEqual({ locked: false, remaining: 1 })
  })

  it('15분 안에 5번 틀리면 잠긴다', () => {
    const s = loginLimitState([ago(1000), ago(2000), ago(3000), ago(4000), ago(5000)], NOW)
    expect(s.locked).toBe(true)
    // 5번째(가장 오래된) 실패가 5초 전 → 15분 - 5초 남음
    if (s.locked) expect(s.retryAfterSec).toBe(WINDOW_MS / 1000 - 5)
  })

  it('창 밖의 실패는 세지 않는다', () => {
    const old = ago(WINDOW_MS + 1)
    expect(loginLimitState([old, old, old, ago(1), ago(2)], NOW)).toEqual({ locked: false, remaining: 3 })
  })

  it('6번 이상 쌓여 있으면 최근 5번째 기준으로 풀린다', () => {
    const s = loginLimitState([ago(10_000), ago(1000), ago(2000), ago(3000), ago(4000), ago(5000)], NOW)
    expect(s.locked).toBe(true)
    if (s.locked) expect(s.retryAfterSec).toBe(WINDOW_MS / 1000 - 5)
  })

  it('풀리는 시각이 지나면 다시 시도할 수 있다', () => {
    const fails = [ago(1000), ago(2000), ago(3000), ago(4000), ago(5000)]
    const later = NOW + WINDOW_MS - 5000
    expect(loginLimitState(fails, later)).toEqual({ locked: false, remaining: 1 })
  })
})

describe('normalizeEmail / formatRetryAfter', () => {
  it('대소문자·공백이 달라도 같은 계정으로 센다', () => {
    expect(normalizeEmail('  Test@Test.COM ')).toBe('test@test.com')
  })
  it('남은 시간을 분 단위로 올림한다', () => {
    expect(formatRetryAfter(30)).toBe('1분')
    expect(formatRetryAfter(61)).toBe('2분')
    expect(formatRetryAfter(900)).toBe('15분')
  })
})
