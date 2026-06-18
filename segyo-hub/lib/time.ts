/** Korean relative time, e.g. "방금 전", "3분 전", "2시간 전", "4일 전", then a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour

  if (diff < min) return '방금 전'
  if (diff < hour) return `${Math.floor(diff / min)}분 전`
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}
