# 자동 욕설 필터 설계 (로드맵 #6)

작성일: 2026-07-23
브랜치: feat/profile-phase2a

## 목표

글/댓글 작성 시 한국어 비속어를 서버에서 검사하여 **마스킹**한다. 관리자가 금지어를
DB에서 직접 관리할 수 있고, 작성자에게는 등록 전 경고를 보여준다.

## 결정 사항 (브레인스토밍 결과)

- **처리 방식**: 경고 후 마스킹 — 1차 제출 시 경고 표시(등록 보류), 재제출하면 저장(서버가 마스킹).
- **금지어 관리**: 기본 사전 시드 + 관리자 DB 관리(banned_words 테이블 + /admin UI).
- **집행 위치**: DB 트리거 (Approach A). 글/댓글이 클라이언트에서 Supabase로 직접
  insert되는 구조라, 우회 불가능한 서버사이드 집행은 DB 트리거가 유일.

## 아키텍처

### 1. 데이터 모델 — `supabase/migrations/0012_profanity_filter.sql`

`public.banned_words`
- `id bigserial pk`
- `word text not null unique` (소문자 정규화하여 저장)
- `created_by uuid references profiles(id)`
- `created_at timestamptz default now()`

기본 한국어 비속어 사전을 `insert ... on conflict do nothing`으로 시드.

RLS: select/insert/delete 모두 **admin 전용** (`current_user_role() = 'admin'`).
→ 일반 사용자에게 금지어 목록이 노출되지 않는다.

### 2. 함수 + 트리거 (서버사이드 집행)

- `public.mask_profanity(input text) returns text` (SECURITY DEFINER)
  - `banned_words`를 순회하며 대소문자 무시 `regexp_replace`로 매칭 부분을 글자 수만큼 `*`로 치환.
  - SECURITY DEFINER라 RLS와 무관하게 목록을 읽어 모든 사용자 대상 동작.
- `public.contains_profanity(input text) returns boolean` (SECURITY DEFINER)
  - `mask_profanity(input) is distinct from input` — 탐지와 마스킹이 동일 로직이라 항상 일관.
  - 클라이언트 경고용 RPC. 목록을 노출하지 않고 boolean만 반환.
- 트리거 `before insert or update`:
  - `posts` (title, content) → 두 컬럼 마스킹
  - `comments` (content) → 마스킹
  - RLS를 우회해 직접 insert해도 저장 직전 마스킹된다.

### 3. 관리자 금지어 관리 UI — `app/(app)/admin/words/page.tsx`

- admin 전용 (moderator 제외). 서버 컴포넌트에서 role 확인 후 목록 조회.
- `components/admin/BannedWordList.tsx` (클라이언트): 목록 표시 + 추가/삭제
  (기존 `ReportList` 패턴 — 클라이언트에서 supabase insert/delete, admin RLS로 보호).
- `/admin/users` 헤더에 "금지어 관리" 링크 추가.

### 4. 작성 시 클라이언트 경고 (경고 후 마스킹)

- `lib/profanity.ts`
  - `buildCheckText(title, contentHtml)` — 순수 함수. HTML 태그 제거 후 title과 합침. (단위 테스트 대상)
  - `checkContainsProfanity(supabase, text): Promise<boolean>` — `contains_profanity` RPC 호출.
- `PostForm` / `PostDetail`(댓글):
  - 제출 시 RPC 검사 → 비속어 있으면 1차 경고 표시(등록 보류, `warned` 상태 true).
  - 사용자가 한 번 더 제출하면 insert 진행(서버 트리거가 마스킹).
  - RPC 실패(네트워크 등) 시 차단하지 않고 그대로 진행 — 트리거가 최종 방어선.

## 엣지 케이스 / 한계

- 마스킹은 원문 기준 매칭 → 띄어쓰기 우회("시 발")는 기본 미탐지. 관리자가 변형을
  목록에 추가하는 방식으로 대응 (YAGNI).
- HTML 본문 내 태그/URL에 우연히 매칭될 위험은 한국어 비속어 특성상 극히 낮음 — 감수.
- 기존 글/댓글은 소급 적용하지 않음 (신규 insert / 수정분만 트리거 적용).

## 보강 (0013) — 우회 대응 & 겹침 마스킹

0012의 리터럴 마스킹을 자모 정규화 기반으로 업그레이드 (`0013_profanity_normalization.sql`).

- `normalize_profanity(text)`: 한글 음절을 자모로 분해, **초성 ㅇ 제거**, **연속 중복 자모 축약**,
  공백·숫자·기호 제거, 영문 소문자화. → "씨이이이발"·"씨발발"·"시 발"·"씨*발"이 모두 "씨발"과
  같은 정규형(ㅆㅣㅂㅏㄹ)이 된다.
- `mask_profanity(text)`: 원문↔정규형 **위치 매핑**을 만들어, 정규형에서 금지어를 찾은 뒤 원문의
  해당 구간만 `*`로 치환. 겹치는 금지어는 원문 위치 **합집합**으로 마스킹 → "좆같은" → "**은".
- 초성 섞임("ㅈ같은")은 정규형 일반화 시 정상어("못 보다"→ㅅㅂ) 오검출 위험이 커, 안전한 변형
  ("ㅈ같", "개ㅅㄲ")만 시드에 추가하고 순수 초성체는 관리자 추가에 위임.
- 트리거·`contains_profanity`는 변경 없이 새 `mask_profanity`를 그대로 재사용.

## 테스트 & 검증

- `buildCheckText` 순수 함수 단위 테스트 추가 (기존 `lib/*.test.ts` 패턴).
- SQL은 CI에서 검증 불가 → `npm run build` 통과 확인 후, DDL SQL을 사용자에게 전달하여
  Supabase 대시보드 SQL Editor에서 Run. 이후 실제 마스킹/경고 동작 수동 검증.
