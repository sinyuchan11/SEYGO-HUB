# 게시판 탭 구분 설계 (로드맵 #7)

작성일: 2026-07-30
브랜치: feat/profile-phase2a

## 목표

`/board`에 카테고리 탭(전체/자유/질문/공지)을 추가해 기존 `board` enum으로 글을 분류해 본다.
스키마 변경 없음. 익명은 별도 탭 없이 각 글의 배지로만 표시(기존 PostListItem).

## 결정 사항 (브레인스토밍 결과)

- 탭: **전체 / 자유(free) / 질문(qna) / 공지(notice)**. `anon` board·익명 전용 탭은 만들지 않음.
- **전체** 탭은 free+qna+notice 모두 표시(공지 포함, 상단 고정 없음).
- 공지 탭은 **모두 열람 가능**, 작성만 관리자(기존 RLS 유지).
- 신고 글은 공개 탭에 넣지 않음(관리자 /admin/reports 유지).
- 검색(q)·정렬(latest/popular)은 탭 전환 시 유지.
- 글쓰기 버튼은 현재 탭을 폼에 넘기지 않음(기본 자유). 추후 옵션.

## 아키텍처

### `lib/board.ts` (순수 헬퍼, 테스트 대상)
- `type BoardKey = 'all' | 'free' | 'qna' | 'notice'`
- `BOARD_TABS`: 탭 목록(key/label)
- `parseBoard(v?)`: 쿼리값 → BoardKey (기본 'all')
- `boardHeading(key)`: { title, subtitle } 헤더 문구
- `boardEmptyText(key)`: 빈 상태 문구

### `app/(app)/board/page.tsx`
- `searchParams`에 `board` 추가 → `parseBoard`로 파싱.
- 쿼리: `board !== 'all'`이면 `.eq('board', board)` 추가. 나머지(deleted_at, q ilike, 정렬)는 그대로.
- 카테고리 탭 줄을 정렬 탭 위에 추가. 각 탭 링크는 `board`를 바꾸고 `sort`·`q` 유지.
- 정렬 탭·검색폼도 현재 `board`를 유지하도록 href/hidden input 갱신.
- 헤더·빈 상태 문구를 `boardHeading`/`boardEmptyText`로 동적화.

## 테스트 & 검증
- `lib/board.test.ts`: parseBoard/boardHeading/boardEmptyText 단위 테스트.
- `npm run build` 통과 + Supabase 수동 확인(탭 전환·검색·정렬 유지).
