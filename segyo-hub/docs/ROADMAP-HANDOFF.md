# Segyo Hub — 로드맵 핸드오프

새 세션에서 이어서 개발할 때를 위한 인수인계 문서. 맨 아래 "새 세션 프롬프트"를 복사해 첫 메시지로 붙여넣으면 된다.

## 프로젝트
- 위치: `C:\sinyuchan\Segyo Hub\segyo-hub` (git 루트는 `C:\sinyuchan\Segyo Hub`)
- Next.js 16.2.6 (Turbopack) + Supabase + Tailwind v4 + TipTap + lucide-react. Windows / PowerShell.
- **AGENTS.md 먼저 읽기** (비표준 Next.js 16: middleware 대신 `proxy.ts`, 애매하면 `node_modules/next/dist/docs/` 참고).
- GitHub: https://github.com/sinyuchan11/SEYGO-HUB
- 로컬 브랜치는 `master`, 원격은 `main`. 푸시: `git push origin master:main` (upstream 설정 안 돼 있으니 `git push`만 치면 안 됨).
- 기능 단위로 `npm run build` + `npm test` 확인 → 커밋 → 푸시. 커밋 메시지 끝에 `Co-Authored-By: Claude` 추가.

## 핵심 규칙 (실수 방지)
- **디자인 토큰만 사용**: `bg-surface/bg-canvas/bg-muted/text-foreground/text-muted-fg/border-border/text-danger/text-primary-600` 등. `bg-white`·`text-gray-*`·`text-blue-*`·`text-red-*` 하드코딩 금지(다크모드 깨짐). 오버레이용 `bg-black/xx`만 예외.
- **다크모드**: `app/globals.css`의 `.dark` 블록에서 토큰만 오버라이드. 토글은 상단바 `ThemeToggle`.
- **클라이언트 컴포넌트의 시각**은 `@/lib/time`의 `timeAgo()` + `suppressHydrationWarning` 사용 (ko-KR `toLocaleString`은 오후/PM 하이드레이션 오류남).
- **아이콘**은 lucide-react 기반. `components/ui/icons.tsx`에서 lucide 아이콘을 import해 `icon()` 래퍼로 export하고, 앱 코드는 이 파일에서만 가져다 쓴다. 새 아이콘이 필요하면 여기에 export를 추가. 이모지 아이콘 금지. (예외: `components/post/RichEditor.tsx`의 툴바는 자체 인라인 SVG 사용)
- **Supabase 무료 플랜**: 미사용 시 자동 중단됨(`Failed to fetch`) → 테스트 전 반드시 대시보드에서 **Restore**로 깨우기. 테스트 계정 `test@test.com` / `test1234` (admin). `.env.local`에 실제 키. 프로젝트 ref `zpbaafueanwzwmasqnbp`.
- **환경변수 없이도 빌드/테스트가 통과해야 함** — 키가 없다고 모듈 로드 시점에 throw 하지 말 것.
- **DDL 직접 실행 불가**: `supabase/migrations/`에 마이그레이션 파일 만들고, 같은 SQL을 사용자에게 줘서 **대시보드 SQL Editor에 붙여넣어 Run** 하도록 안내.
- **RLS**는 `public.current_user_role()` 헬퍼(0006) 사용. **이미지 업로드**는 서버 라우트에서 service-role + 매직바이트 검증 (`app/api/upload`, `app/api/admin/info-image` 참고). 공개 버킷: `post-images`, `profile-images`, `info-images`.
- `.env.local` 읽는 검증 스크립트에서 변수명을 `URL`로 쓰지 말 것(전역 `URL` 가려서 `fetch` 깨짐) → `BASE` 사용.
- **완료 주장 전 실제 빌드/동작 검증**.

## 이미 완료 (main 반영됨)
- 앱 기반: 로그인(스플릿 카드) / 리치에디터 글쓰기(TipTap) / 게시판 카드피드+검색+정렬+FAB / 홈(`/` 실제 페이지: 배너·검색·바로가기·인기/최근·식단일정·공지) / 내정보+프로필편집(아바타·커버 업로드) / 댓글 UI(아바타·스레드) / 알림(배지·`/notifications`) / 식단표·일정표·공지(관리자 `/admin/info`, 이미지+라이트박스)
- 로드맵: **#1** 아이콘 세트(lucide) · **#3** 프로필 메뉴+로그아웃 · **#4** 다크모드 · **#5** 게시글 신고(`/admin/reports`) · **#6** 욕설 필터(마스킹+`/admin/words`+우회 의심 관리자 알림) · **#7** 게시판 구분(전체/자유/질문 탭) · **#8** 친구추가(`/friends`, `/u/[id]`) · **#9** 1:1 DM(`/messages`, 실시간+읽음 표시) · **#10** 멘션(글·댓글 `@닉네임` + 자동완성 + 알림)
- 공지는 게시판 글이 아니라 홈의 관리자 공지 카드(`info_cards`)로 옮겨졌다. 그래서 board 탭은 `all/free/qna` 셋뿐 (`lib/board.ts`).

## 남은 로드맵
2. **글 상세 페이지 디자인 개선** — 사용자가 캡처를 줄 예정. 먼저 캡처를 요청할 것.

## 중단된 작업 (이어서 하려면)
- **게시판 카드/리스트 뷰 토글**: `icons.tsx`에 `GridIcon`/`ListIcon`만 추가돼 있고 어디서도 안 쓰인다. `/board`에 뷰 전환 UI가 미구현 상태로 남음.

## 라우트
- 앱: `/`, `/board`, `/post/new`, `/post/[id]`, `/me`, `/me/edit`, `/u/[id]`, `/friends`, `/messages`, `/messages/[id]`, `/notifications`
- 관리자: `/admin/info`, `/admin/reports`, `/admin/users`, `/admin/words`
- 인증: `/login`, `/signup`, `/onboarding`, `/pending`
- API: `/api/upload`, `/api/admin/info-image`, `/api/admin/users/[id]/role`, `/api/notifications/read`

## 마이그레이션 현황 (라이브 적용됨)
`0001`~`0022`. 최근: `0018` dm, `0019` dm 읽음 표시, `0020` 공지 info_card,
`0021` 멘션(`mention` 알림 종류 + 닉네임 매칭 함수 + 글/댓글 트리거),
`0022` 멘션 알림을 항상 발송(댓글 알림과 중복 생략하던 규칙 제거).

## 테스트
`npm test` (vitest). `lib/` 순수 로직(board·dm·friends·permissions·profanity·profile)과 일부 UI 컴포넌트에 테스트가 있다. 로직 추가 시 같이 붙일 것.

---

## 새 세션 프롬프트 (복사해서 붙여넣기)

```
Segyo Hub(세교중 커뮤니티) 프로젝트를 이어서 개발할 거야.
먼저 docs/ROADMAP-HANDOFF.md 와 AGENTS.md 를 읽고 맥락·규칙을 숙지해줘.
그 문서의 "남은 로드맵"을 순서대로 하나씩(완료→빌드확인→커밋→푸시) 진행할 건데,
어디부터 할지 나에게 먼저 물어보고 시작해줘. 부족한 부분은 알아서 채워서.
(테스트 전 Supabase가 중단돼 있으면 대시보드 Restore 필요. 테이블/컬럼 추가는 SQL을 나한테 줘서 대시보드에서 실행하게 해줘.)
```
