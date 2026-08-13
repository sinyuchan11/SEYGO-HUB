# 멘션(@) 설계 (로드맵 #10)

작성일: 2026-08-13
브랜치: main

## 목표

글 본문과 댓글에서 `@닉네임`으로 다른 사용자를 멘션하고, 멘션된 사용자에게 알림을 보낸다.
입력은 자동완성 드롭다운과 직접 타이핑 **둘 다** 지원한다.

## 결정 사항

- **범위**: 글 본문 + 댓글/대댓글 둘 다.
- **입력**: 자동완성 + 직접 타이핑 모두. 자동완성은 편의 기능일 뿐이고,
  **알림의 단일 진실 공급원은 DB 트리거의 닉네임 대조**다.
  (클라이언트가 멘션 대상 id를 직접 보내면 알림 스팸이 가능하므로 그 경로는 쓰지 않는다.)
- **저장 형식은 평문 `@닉네임`**. TipTap mention 노드(`<span data-type="mention">`)를 쓰지 않는다.
  - 이유: 노드를 쓰면 ① DOMPurify 허용 태그/속성을 넓혀야 하고 ② 자동완성으로 넣은 멘션과
    직접 타이핑한 멘션의 저장 형태가 갈려 렌더링·알림 로직이 두 벌이 된다.
  - 평문으로 통일하면 글·댓글이 같은 파서 하나를 공유하고, 정제 설정도 그대로 둘 수 있다.
- **매칭 규칙**: `@` 바로 뒤에서 **실제 닉네임 목록과 최장일치**. 정규식 `@\w+`를 쓰지 않는다.
  - 닉네임은 `text unique`일 뿐 형식 제약이 없다(공백·특수문자 가능).
  - 최장일치라 `@테스트님` → `테스트` 멘션 + `님`은 평문이 된다(한국어 조사 대응).
  - `@`는 문자열 시작이거나 앞이 공백/여는 태그여야 한다 → 이메일 `a@b.com` 오탐 방지.
- **알림**: 한 글/댓글당 사용자별 1건. 본인 멘션은 알림 없음.
  - 처음엔 이미 `comment_on_post`/`reply_on_comment` 알림을 받는 사람에게 `mention`을 생략했는데,
    "내 글에 달린 댓글에서 나를 멘션"하는 흔한 경우에 멘션 알림이 안 보여 멘션이 묻혔다.
    → `0022`에서 되돌려, 작성자 본인만 제외하고 **항상 발송**한다.
- **익명 글/댓글**: 멘션 알림은 정상 발송하되 `payload.actor_id`를 넣지 않는다(익명성 유지).
- 멘션된 닉네임은 `/u/[id]` 링크 + `text-primary-600`으로 표시.

## 데이터 모델 — `0021_mentions.sql`

- `notification_kind` enum에 `'mention'` 추가 (`check_function_bodies=off`, 0017과 동일 패턴).
- `public.mentioned_profile_ids(content text, exclude_ids uuid[]) → uuid[]` (security definer):
  - HTML 태그 제거(`regexp_replace(content, '<[^>]*>', ' ', 'g')`) 후 매칭 → 글 본문의 URL·속성 오탐 방지.
  - 경계 조건: `(^|[^[:alnum:]_])@닉네임`.
  - 닉네임이 다른 매칭 닉네임의 접두사면 제외(최장일치 근사).
  - `exclude_ids`(작성자, 이미 다른 알림을 받는 사람) 제외.
- 트리거:
  - `posts` after insert → `mentioned_profile_ids(new.body, array[new.author_id])`
  - `comments` after insert → 작성자만 exclude (`0022`)
  - payload: `{post_id, comment_id?, actor_id?}` — 익명이면 `actor_id` 생략

## `lib/mentions.ts` (순수, 테스트 대상)

- `extractMentions(text, nicknames): string[]` — 최장일치로 멘션된 닉네임 추출(중복 제거).
- `splitMentions(text, nicknames): Segment[]` — 평문 렌더링용 조각 배열(`{type:'text'|'mention', value}`).
- `linkifyMentionsHtml(html, nicknames): string` — 정제된 HTML의 **태그 바깥 텍스트만** 골라 멘션을 감싼다.
  글 본문과 댓글이 같은 매칭 규칙을 공유하게 하는 핵심.

## 화면

- `components/mention/MentionAutocomplete.tsx` (클라이언트): `@` 입력 감지 → 닉네임 목록 필터 →
  선택 시 `@닉네임 ` 삽입. 댓글 textarea와 RichEditor 양쪽에서 재사용.
  - RichEditor 쪽은 `@tiptap/suggestion`으로 트리거를 잡되 **삽입은 평문**으로 한다.
- `CommentTree`: `splitMentions`로 조각 렌더링, 멘션은 `/u/[id]` 링크.
- `PostDetail`: DOMPurify 정제 후 `linkifyMentionsHtml` 적용.
- 멤버 목록(`{id, nickname}`)은 서버 컴포넌트에서 조회해 prop으로 내린다(별도 API 라우트 없음).
- `lib/notifications.ts`: `NotifKind`에 `'mention'`, 라벨 "누군가 회원님을 멘션했어요", 링크는 `post_id` 기준.

## 테스트 & 검증

- `lib/mentions.test.ts`: 최장일치, 한국어 조사, 이메일 오탐, HTML 태그 내부 오탐, 중복 제거.
- `npm run build` + `npm test`.
- `0021` SQL은 사용자가 대시보드에서 Run → 글/댓글 작성으로 알림 생성·중복 방지 확인.
