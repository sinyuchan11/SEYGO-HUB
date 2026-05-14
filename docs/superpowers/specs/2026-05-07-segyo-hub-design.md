# 세교중학교 커뮤니티 (Segyo Hub) — 설계 문서

작성일: 2026-05-07
프로젝트 디렉토리: `C:\projects\Segyo Hub`
상태: 설계안 (구현 전)

## 1. 프로젝트 개요

세교중학교 학생 5~20명 규모의 친구 그룹이 사용할 비공식 커뮤니티 웹사이트. 운영은 작성자(이하 "관리자") 1인이 시작하며, 학교 공식 승인 없이 친구 단위로 시작해서 점차 확장한다.

### 목표
- 모바일(핸드폰) 우선 사용자 경험
- 무료 호스팅으로 운영 (Vercel + Supabase 무료 tier)
- 작성자(관리자)에게 강한 모더레이션 권한
- 미성년자 안전을 위한 가드레일을 처음부터 내장

### 비목표 (이번 범위 밖)
- 외부 푸시 알림 / 이메일 알림 (사이트 내 배지로만 시작)
- 파일/이미지 업로드 (텍스트만)
- 1:1 다이렉트 메시지
- 학교 공식 인증 (학교 이메일 검증 등)
- 모바일 네이티브 앱 (반응형 웹만)

## 2. 사용자와 권한

4단계 역할 체계.

| 역할 | 가입 시 | 권한 |
|---|---|---|
| `pending` (대기자) | 가입 직후 자동 부여 | 소개/안내 페이지 읽기만. 글쓰기·채팅·반응 ❌ |
| `member` (멤버) | 관리자가 승인 시 | 게시판/익명방 글·댓글·대댓글, 좋아요, 채팅, 투표 참여 |
| `moderator` (모더) | 관리자가 지정 | 멤버 권한 + 게시글/댓글 삭제, 신고 처리, 멤버 타임아웃 (1h/24h/7d) |
| `admin` (관리자) | 시드 계정 | 전 권한 + 권한 변경, 추방, 비속어 원문 조회, 익명방 작성자 조회, 투표 생성, audit 로그 조회 |

### 가입/승격 흐름
1. 이메일+비밀번호로 회원가입 (Supabase Auth)
2. 자동으로 `pending` 상태가 됨, 닉네임은 아직 없음
3. 관리자가 관리자 페이지 → 사용자 관리에서 "멤버 승격"
4. 사용자가 다음 로그인 시 닉네임/(선택)학년반 입력 화면을 한 번 거침
5. 정상 사용

## 3. 기능 명세

### 3.1 인증 (로그인)
- Supabase Auth 이메일+비밀번호 방식
- 가입 시 동의 체크박스: "운영자는 이 사이트의 모든 글과 익명글 작성자를 볼 수 있습니다"에 명시 동의
- 비밀번호 재설정: MVP에서는 관리자가 임시 비번 발급 → 첫 로그인 시 변경. Phase 4에서 Supabase 기본 메일 흐름으로 자동화

### 3.2 게시판
- 카테고리: `free` (자유), `notice` (공지, 모더 이상만 작성), `qna` (Q&A)
- 글 목록 / 글 상세 / 키워드 검색 (제목+본문)
- 작성자에게는 본인 글 수정/삭제 가능
- 모더 이상은 모든 글 삭제 가능 (소프트 삭제 → `deleted_at` 기록)

### 3.3 익명방
- 게시판과 동일한 UI
- 작성자 표시 자리에 글 단위 랜덤 ID (예: `익명#A3F2`)
- 동일한 글 안에서 같은 user는 항상 같은 익명 ID로 표시 (스레드 추적성). 다른 글에서는 같은 user여도 다른 ID
- 익명 ID 생성: `hash(post_id || user_id || secret_salt)` 앞 4자리
- DB에는 실제 `author_id`가 저장됨, RLS로 일반 사용자 SELECT 차단
- 관리자 페이지에서 작성자 조회 가능 (모더는 불가)

### 3.4 소통방 (실시간 채팅)
- 단일 단체 채팅방 (MVP)
- Supabase Realtime으로 `chat_messages` 테이블 INSERT 구독
- 최근 100개 로드, 위로 스크롤 시 페이지네이션
- 메시지 좋아요 / 답장 인용 / 멘션은 v2

### 3.5 댓글 & 대댓글
- 게시판/익명방 글에 댓글, 댓글에 대댓글 (2단계까지)
- 좋아요는 글/댓글/대댓글 전부 가능 (1인 1회 토글)

### 3.6 좋아요 (반응)
- `reactions` 단일 테이블로 글/댓글/대댓글에 통합 적용
- 본인 좋아요 토글 가능, 누가 좋아요 눌렀는지는 표시 안 함 (개수만)

### 3.7 투표/설문
- 관리자/모더만 생성
- 단일선택 / 복수선택 두 종류
- 마감일 설정 가능
- 일반 사용자에게는 결과 집계만 (누가 뭘 골랐는지 안 보임)
- 관리자 페이지에서는 개별 투표 내역 조회 가능 (audit 용도)

### 3.8 비속어 처리
- 단어 사전 (한국어 비속어 + 변형 일부) 기반 자동 필터
- 일반 사용자가 보는 화면에서는 `시**` 식으로 마스킹
- 원문은 DB에 그대로 저장
- 관리자 페이지의 "비속어 모니터"에서 원문 + 작성자 + 컨텍스트 확인 가능

### 3.9 신고 / 타임아웃 / 추방
- 글/댓글/채팅 메시지에 신고 버튼 (사유 선택)
- 모더 이상이 신고 큐를 처리: 무시 / 글 삭제 / 작성자 타임아웃
- 타임아웃: 1시간 / 24시간 / 7일 — `profiles.timeout_until` 설정
- 타임아웃 중에는 글쓰기/채팅/투표 모두 차단 (RLS)
- 추방: 관리자만. `profiles.role = 'banned'`로 변경. 추방 시 글 처리(남김/익명화/삭제) 선택

### 3.10 관리자 페이지
- 사용자 관리: 역할 드롭다운 변경, 타임아웃, 추방
- 신고 큐: 미처리 신고 리스트
- 비속어 모니터: 마스킹된 글 원문 조회
- 익명방 작성자 조회: 글/댓글의 진짜 작성자 표시
- 투표 만들기
- Audit 로그: 누가 언제 어떤 권한 행사를 했는지

### 3.11 알림 (사이트 내)
- 상단 종 아이콘 + 빨간 배지
- 트리거: 내 글에 댓글, 내 댓글에 대댓글, 내가 멘션됨(v2), 채팅방 새 메시지(읽지 않은 카운트)
- 페이지 진입 시 읽음 처리

## 4. 데이터 모델 (Supabase Postgres)

```sql
-- auth.users 는 Supabase가 관리

profiles
  id              uuid PK references auth.users(id)
  nickname        text unique  -- pending 상태에서는 null 가능
  role            text         -- 'pending'|'member'|'moderator'|'admin'|'banned'
  grade_class     text         -- '1-3' 등, 선택 입력
  timeout_until   timestamptz  -- null이면 정상
  created_at      timestamptz default now()
  agreed_to_terms_at timestamptz

posts
  id              bigserial PK
  author_id       uuid references profiles(id)
  board           text         -- 'free'|'notice'|'qna'|'anon'
  title           text
  content         text
  is_anonymous    bool         -- board='anon' 일 때 true
  created_at      timestamptz default now()
  deleted_at      timestamptz

comments
  id                bigserial PK
  post_id           bigint references posts(id) on delete cascade
  author_id         uuid references profiles(id)
  parent_comment_id bigint references comments(id) on delete cascade  -- 대댓글
  content           text
  created_at        timestamptz default now()
  deleted_at        timestamptz

reactions
  id              bigserial PK
  user_id         uuid references profiles(id)
  target_type     text         -- 'post'|'comment'
  target_id       bigint
  created_at      timestamptz default now()
  unique(user_id, target_type, target_id)

chat_messages
  id              bigserial PK
  author_id       uuid references profiles(id)
  content         text
  created_at      timestamptz default now()
  deleted_at      timestamptz

polls
  id              bigserial PK
  creator_id      uuid references profiles(id)
  question        text
  poll_type       text         -- 'single'|'multi'
  closes_at       timestamptz
  created_at      timestamptz default now()

poll_options
  id              bigserial PK
  poll_id         bigint references polls(id) on delete cascade
  option_text     text

poll_votes
  poll_id         bigint references polls(id) on delete cascade
  option_id       bigint references poll_options(id) on delete cascade
  user_id         uuid references profiles(id)
  created_at      timestamptz default now()
  unique(poll_id, user_id, option_id)

reports
  id              bigserial PK
  reporter_id     uuid references profiles(id)
  target_type     text         -- 'post'|'comment'|'chat_message'
  target_id       bigint
  reason          text
  status          text default 'open'   -- 'open'|'resolved'|'dismissed'
  resolved_by     uuid references profiles(id)
  created_at      timestamptz default now()

profanity_flags
  id              bigserial PK
  target_type     text         -- 'post'|'comment'|'chat_message'
  target_id       bigint
  matched_terms   text[]
  created_at      timestamptz default now()

notifications
  id              bigserial PK
  user_id         uuid references profiles(id)
  kind            text         -- 'comment_on_post'|'reply_on_comment'
  payload         jsonb        -- {post_id, comment_id, actor_nickname} 등
  read_at         timestamptz
  created_at      timestamptz default now()

chat_read_state    -- 채팅 안 읽은 메시지 카운트는 별도 테이블로
  user_id         uuid PK references profiles(id)
  last_read_message_id bigint references chat_messages(id)
  updated_at      timestamptz default now()

audit_log
  id              bigserial PK
  actor_id        uuid references profiles(id)
  action          text         -- 'role_change'|'timeout'|'ban'|'view_anon_author'|'view_profanity_original'
  target          jsonb
  created_at      timestamptz default now()
```

### Row-Level Security (RLS) 핵심 규칙
- `profiles`: 본인은 본인 row READ/UPDATE, 관리자/모더는 모든 row READ. role은 관리자만 UPDATE
- `posts`, `comments`: `pending`이면 INSERT 불가. timeout 중이면 INSERT 불가. 본인 글만 본인이 UPDATE/소프트삭제
- 익명방(`board='anon'`): SELECT 시 `author_id`는 관리자만 조회 가능 — 일반 사용자에게는 view를 통해 author_id를 노출하지 않음
- `chat_messages`: 멤버 이상만 INSERT/SELECT
- `reactions`: 본인만 INSERT/DELETE, 카운트 집계는 모두 SELECT
- `polls`, `poll_options`: SELECT 모두, INSERT는 모더/관리자만
- `poll_votes`: 멤버 본인만 INSERT (1인 1표 정책은 unique 제약)
- `audit_log`: 관리자만 SELECT, INSERT는 서버 RPC를 통해서만

## 5. 화면 구조 (모바일 우선)

### 하단 탭 네비게이션 (5탭)
- 홈 / 게시판 / 채팅 / 익명방 / 내정보

### 페이지
- `/login` — 이메일+비번 로그인
- `/signup` — 가입 폼 (동의 체크 포함)
- `/onboarding` — 멤버 승격 후 닉네임 첫 설정
- `/pending` — 대기자 안내 페이지
- `/` (홈) — 최신글 요약, 진행 중인 투표
- `/board/[category]` — 카테고리별 글 목록 + 검색
- `/post/[id]` — 글 상세 + 댓글/대댓글
- `/post/new` — 새 글 작성
- `/anon` — 익명방 목록
- `/anon/[id]` — 익명 글 상세
- `/chat` — 단체 채팅
- `/me` — 내 정보 / 내 글 / 로그아웃
- `/admin` — 관리자/모더 전용
  - `/admin/users` — 사용자/권한
  - `/admin/reports` — 신고 큐
  - `/admin/profanity` — 비속어 모니터
  - `/admin/anon-authors` — 익명 작성자 조회 (관리자만)
  - `/admin/polls` — 투표 만들기/관리
  - `/admin/audit` — 감사 로그 (관리자만)

### 컴포넌트 책임 분리
- `components/auth/*` — 가입/로그인 폼, 권한 가드
- `components/post/*` — 글 카드, 글 상세, 작성기
- `components/comment/*` — 댓글 리스트, 대댓글 트리, 작성 폼
- `components/chat/*` — 메시지 리스트, 입력창, Realtime 구독 훅
- `components/admin/*` — 사용자 테이블, 신고 큐, 비속어 뷰 등
- `lib/supabase.ts` — Supabase 클라이언트 (서버/브라우저 분리)
- `lib/profanity.ts` — 비속어 매칭 + 마스킹 함수
- `lib/permissions.ts` — 역할 가드 헬퍼

각 컴포넌트는 단일 책임을 가진다. 예를 들어 `PostCard`는 글 1개를 카드로 그리는 일만 하고, 좋아요 버튼은 별도 `LikeButton` 컴포넌트가 자체 상태와 mutation을 관리한다.

## 6. 단계별 로드맵

### Phase 1 — 기반 (목표 2~3주)
- 프로젝트 셋업 (Next.js + Supabase, Vercel 배포)
- 인증 + 가입 동의 + 대기자/승급 흐름
- 게시판 (자유) + 글 작성/수정/삭제
- 댓글 + 대댓글
- 좋아요 (글/댓글)
- 사이트 내 알림 (내 글에 댓글 / 내 댓글에 대댓글) — 종 아이콘 배지
- 관리자 페이지 — 사용자 관리만

### Phase 2 — 모더레이션 (1~2주)
- 익명방
- 비속어 필터 + 마스킹 + 관리자 원문 조회
- 신고 시스템 + 신고 큐
- 타임아웃 / 추방 + 권한 가드 강화
- audit 로그

### Phase 3 — 실시간 (1~2주)
- 소통방 (Supabase Realtime)
- 채팅 안 읽음 카운트 (chat_read_state)

### Phase 4 — 다듬기 (시간 봐가며)
- 투표/설문
- 검색 개선
- UI 다듬기, 작은 버그 정리

## 7. 안전·법적 가드레일

처음부터 박아둘 것:

1. **이용약관 명시 동의**: 가입 시 체크박스. "운영자는 모든 글과 익명글의 작성자를 볼 수 있어요" 명문화
2. **개인정보 최소 수집**: 이메일 외에는 필수 항목 없음. 학년반은 선택값. 실명/연락처/사진 수집 안 함
3. **만 14세 미만 정책**: 가입 페이지에 "만 14세 이상만 가입할 수 있어요. 미만 학생은 보호자 동의가 필요해요" 안내. 생년월일은 받지 않고 자기선언으로 운영 (비공식 커뮤니티 한계)
4. **데이터 보관 정책**: 탈퇴 시 본인 글 자동 익명화 옵션 제공. audit_log는 1년 후 자동 삭제 (cron)
5. **추방 시 데이터 처리**: 글 남김 / 익명화 / 삭제 중 관리자가 선택
6. **백업 & 복구**: Supabase 자동 백업 (무료 tier는 7일). 운영자 책임으로 명시
7. **사이버불링 대응**: 신고 → 24시간 내 검토 약속 (운영자 1인이면 현실적으로 가능한 범위)
8. **로그 최소화**: 비속어/익명 작성자 조회 같은 민감 액션은 audit_log에 기록되어 운영자도 자기 행동에 책임을 짐

## 8. 테스트 전략

- **유닛 테스트**: 비속어 매칭/마스킹 함수, 권한 가드 헬퍼, 익명 ID 생성기
- **통합 테스트** (Supabase 로컬 또는 테스트 프로젝트): RLS 정책이 의도대로 동작하는지 (대기자가 글 못 쓴다 / 익명방 author_id를 일반 사용자가 못 본다 / 타임아웃 사용자가 글 못 쓴다)
- **수동 QA 시나리오**: 가입 → 대기 → 승격 → 글쓰기 / 신고 → 타임아웃 / 익명글 → 관리자 작성자 조회

## 9. 운영 메모

- 호스팅: Vercel 무료 tier (Hobby), Supabase 무료 tier
- 도메인: 처음에는 `*.vercel.app` 기본 도메인, 필요 시 `.com/.kr` 추가 (~1만원/년)
- 모니터링: Vercel Analytics 기본 + Supabase 대시보드의 쿼리 로그
- 비용 한계가 보이면 Phase 4 이후에 유료 플랜 검토
