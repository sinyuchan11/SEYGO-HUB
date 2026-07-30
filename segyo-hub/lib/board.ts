// 공지는 게시판 글이 아니라 홈의 관리자 공지 카드(info_cards)로 이동함.
export type BoardKey = 'all' | 'free' | 'qna'

export const BOARD_TABS: { key: BoardKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'free', label: '자유' },
  { key: 'qna', label: '질문' },
]

/** Parse the `board` query param into a valid tab key (defaults to 'all'). */
export function parseBoard(v: string | undefined): BoardKey {
  return v === 'free' || v === 'qna' ? v : 'all'
}

/** Header title + subtitle for a board tab. */
export function boardHeading(key: BoardKey): { title: string; subtitle: string } {
  switch (key) {
    case 'free':
      return { title: '자유 게시판', subtitle: '자유롭게 이야기를 나눠보세요' }
    case 'qna':
      return { title: '질문 게시판', subtitle: '궁금한 걸 물어보세요' }
    default:
      return { title: '게시판', subtitle: '전체 글을 모아봤어요' }
  }
}

/** Empty-state message for a board tab. */
export function boardEmptyText(key: BoardKey): string {
  switch (key) {
    case 'qna':
      return '아직 질문이 없어요'
    default:
      return '아직 글이 없어요'
  }
}
