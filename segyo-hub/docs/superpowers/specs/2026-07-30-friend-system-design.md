# 친구 시스템 설계 (로드맵 #8)

작성일: 2026-07-30
브랜치: feat/profile-phase2a

## 목표

친구 요청/수락/목록 + 타인 프로필 페이지 + 닉네임 검색. 새 테이블 friendships.
알림은 기존 notifications 재사용.

## 결정 사항 (브레인스토밍)

- 진입점: 닉네임 검색 **그리고** 타인 프로필 페이지(/u/[id]) 둘 다.
- 거절/요청취소/친구끊기 = 행 삭제 (rejected/blocked 상태 없음).
- 알림: friend_request(→addressee), friend_accept(→requester). 클릭 시 /friends 이동.
- 친구 수를 프로필에 표기하진 않음(범위 제한).

## 아키텍처

### 1. `0017_friendships.sql`
- `friendships(id bigserial pk, requester_id uuid→profiles, addressee_id uuid→profiles,
  status enum('pending','accepted') default 'pending', created_at, responded_at,
  check(requester_id <> addressee_id))`
- 무방향 유일성: `unique index (least(requester_id,addressee_id), greatest(requester_id,addressee_id))`
- RLS:
  - insert: `auth.uid()=requester_id` and 둘 다 member+ and status='pending'
  - select: `auth.uid() in (requester_id, addressee_id)`
  - update: `auth.uid()=addressee_id` (pending→accepted 수락; responded_at 갱신)
  - delete: `auth.uid() in (requester_id, addressee_id)` (취소/거절/끊기)
- enum notification_kind에 'friend_request','friend_accept' 추가 (check_function_bodies=off).
- 트리거:
  - after insert → addressee에게 friend_request 알림 (payload actor_id=requester_id)
  - after update (pending→accepted) → requester에게 friend_accept 알림 (actor_id=addressee_id)
  - 알림 함수는 security definer (notifications RLS 우회).

### 2. `lib/friends.ts` (순수, 테스트 대상)
- `type FriendState = 'none' | 'outgoing' | 'incoming' | 'friends'`
- `resolveFriendState(row | null, myId)`: 관계 행과 내 id로 상태 판정.

### 3. 컴포넌트 / 페이지
- `components/friends/FriendButton.tsx` (클라이언트): 상태별 버튼(추가/요청됨·취소/수락·거절/친구·끊기). 상대가 이미 요청했으면 '추가'가 수락으로 동작.
- `app/(app)/u/[id]/page.tsx`: get_profile_with_stats 조회 + ProfileHeader(actionSlot=FriendButton)+ProfileAbout. 본인이면 '프로필 편집'.
- `app/(app)/friends/page.tsx`: 친구목록 / 받은요청 / 보낸요청 / 닉네임검색. 클라이언트 상호작용 컴포넌트 포함.
- 작성자 닉네임 → /u/[id] 링크 (PostListItem, PostDetail; 익명 글 제외).
- 프로필 메뉴 / me 페이지에 '친구' 링크.
- 알림 UI(NotificationBell, notifications page)에 friend_request/friend_accept 라벨·아이콘 + kind별 링크(/friends).

## 테스트 & 검증
- `lib/friends.test.ts`: resolveFriendState.
- `npm run build`. 0017 SQL은 사용자 대시보드 Run → 서비스 롤로 요청/수락/중복차단/알림 검증.
