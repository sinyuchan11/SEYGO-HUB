// 로그인 실패 횟수 제한. 순수 로직만 둔다(DB 접근은 app/api/auth/login/route.ts).
//
// 규칙: 최근 WINDOW 안에 MAX_FAILURES 번 틀리면 잠긴다. 슬라이딩 윈도라서
// "최근 5번째 실패 + WINDOW" 시각이 되면 창 안의 실패가 4번으로 줄어 자동으로 풀린다.
// 잠긴 동안의 시도는 Supabase 까지 가지 않고 기록도 하지 않으므로 잠금이 늘어나지 않는다.

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000

export type LoginLimitState =
  | { locked: false; remaining: number }
  | { locked: true; retryAfterSec: number }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** failures: 실패 시각(ms) 목록. 순서 무관, 창 밖의 값이 섞여 있어도 된다. */
export function loginLimitState(failures: number[], now: number): LoginLimitState {
  const recent = failures.filter((t) => t > now - WINDOW_MS && t <= now).sort((a, b) => b - a)
  if (recent.length < MAX_FAILURES) {
    return { locked: false, remaining: MAX_FAILURES - recent.length }
  }
  const unlockAt = recent[MAX_FAILURES - 1] + WINDOW_MS
  return { locked: true, retryAfterSec: Math.max(1, Math.ceil((unlockAt - now) / 1000)) }
}

export function formatRetryAfter(sec: number): string {
  const min = Math.ceil(sec / 60)
  return min <= 1 ? '1분' : `${min}분`
}
