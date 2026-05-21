# Supabase 셋업 가이드 (단계별 따라하기)

세교 허브를 처음 띄우려면 Supabase 프로젝트가 필요합니다. 이 문서만 위에서 아래로 따라 하면 됩니다. 무료 플랜으로 충분합니다.

준비물: 이메일 1개, 약 15분.

---

## 1단계. 계정 만들고 프로젝트 생성

1. <https://supabase.com> 접속 → 우측 상단 **Start your project** 또는 **Sign in**
2. GitHub 계정으로 로그인하는 게 가장 쉽습니다 (없으면 이메일로 가입)
3. 로그인 후 대시보드에서 **New project** 클릭
4. 다음 값을 입력:
   - **Name**: `segyo-hub` (아무거나 OK)
   - **Database Password**: 강한 비밀번호 자동 생성 버튼 누르고 **꼭 어딘가에 저장**. 잃어버리면 DB 직접 접근이 어려워집니다.
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 빠름)
   - **Pricing Plan**: `Free`
5. **Create new project** 클릭 → 1~2분 대기 (커피 한 모금)

> 만들어진 후 대시보드 좌측 사이드바가 보이면 성공.

---

## 2단계. API 키 3개 복사

좌측 사이드바 맨 아래 **⚙️ Project Settings** → **API** 메뉴.

복사해 둘 값 3개:

| 항목 | 라벨 | 비고 |
|---|---|---|
| 프로젝트 URL | **Project URL** | `https://xxxx.supabase.co` 형태 |
| 공개 키 | **Project API keys → `anon` `public`** | 클라이언트(브라우저)에서 쓰는 키 |
| 비밀 키 | **Project API keys → `service_role` `secret`** | ⚠️ 서버 전용. 절대 외부 공개 X |

> `service_role` 키는 RLS를 우회할 수 있어서 매우 강력합니다. 깃에 커밋하거나 클라이언트 코드에 노출되면 안 됩니다. `.env.local`은 이미 `.gitignore`에 들어있으니 그대로 두세요.

---

## 3단계. 로컬에 키 넣기

프로젝트 폴더(`segyo-hub/`)에 `.env.local` 파일이 이미 있는지 확인:

```powershell
ls .env.local
```

없다면 예시 파일을 복사해서 만듭니다:

```powershell
Copy-Item .env.local.example .env.local
```

`.env.local`을 열어 2단계에서 복사한 값을 채워 넣으세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...(anon public 키)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...(service_role secret 키)
```

저장하고 종료.

---

## 4단계. 데이터베이스 마이그레이션 실행

`supabase/migrations/` 폴더 안 SQL 6개를 **파일명 순서대로 하나씩** 적용합니다. 절대 한꺼번에 붙여넣지 마세요. 순서가 어긋나면 뒤 파일이 앞 파일의 테이블을 참조 못 해 깨집니다.

| 순서 | 파일 | 무엇을 만드는지 |
|---|---|---|
| 1 | `0001_profiles.sql` | 사용자 프로필 + 역할(role) + RLS |
| 2 | `0002_posts.sql` | 게시글 테이블 |
| 3 | `0003_comments.sql` | 댓글(2단 깊이까지) |
| 4 | `0004_reactions.sql` | 좋아요 |
| 5 | `0005_notifications.sql` | 알림 + 자동 생성 트리거 |
| 6 | `0006_fix_rls_recursion.sql` | RLS 정책 무한 재귀 fix (꼭 마지막에) |

### 4-1. 로컬 SQL 파일을 띄우는 방법

붙여넣기 전에 SQL 파일 내용을 안전하게 가져와야 합니다.

1. VS Code(또는 메모장)에서 `segyo-hub/supabase/migrations/0001_profiles.sql` 열기
2. **Ctrl+A** (전체 선택) → **Ctrl+C** (복사)

> 파일을 다 열어두고 위에서 아래로 하나씩 진행하면 헷갈리지 않아요.

### 4-2. Supabase에서 한 번의 실행 사이클

각 파일마다 **이 사이클을 반복**합니다 (총 6번):

1. Supabase 대시보드 좌측 사이드바에서 **SQL Editor** 클릭
2. 상단의 **+ New query** 버튼 클릭 (회색 빈 편집창이 열림)
3. 그 편집창 안을 마우스로 한 번 클릭 → **Ctrl+V** 로 복사한 SQL 붙여넣기
4. 우측 하단 초록색 **Run** 버튼 클릭 (또는 키보드 **Ctrl+Enter**)
5. 하단 패널에 결과 메시지 확인:
   - 초록 **Success**, `No rows returned`, 또는 결과 행이 뜨면 → 성공. 다음 파일로 진행.
   - 빨간 에러 메시지 → 일단 **중단하고 에러 메시지를 그대로 복사**해서 알려주세요.

> 매 파일마다 꼭 **+ New query** 로 새 창을 열어주세요. 같은 편집창에 계속 덮어쓰면 히스토리가 사라져서 뭐가 됐고 뭐가 안 됐는지 추적이 어려워집니다.

### 4-3. 자주 만나는 에러 패턴

**`relation "public.xxx" does not exist`**
→ 순서가 어긋났어요. 0003을 건너뛰고 0005를 돌리면 `public.comments` 가 없다고 나옵니다. 빠진 번호를 먼저 실행하세요.

**`42P17 infinite recursion detected in policy for relation "profiles"`**
→ 0006이 아직 안 돌았어요. 0001~0005만 돌린 상태에서는 모든 SELECT가 이 에러를 받습니다. 0006을 실행하면 해결됩니다.

**`policy "xxx" for table "yyy" already exists`**
→ 같은 파일을 두 번 돌렸을 때 가끔 나옵니다. 무시하고 다음 파일로 진행 OK. 파일들은 재실행 안전(`drop ... if exists`, `create table if not exists`)하게 작성되어 있어서 같은 SQL을 다시 Run해도 데이터는 안 망가집니다.

### 4-4. 끝났는지 확인

좌측 사이드바 **Table Editor** 클릭 → 좌측에 다음 5개 테이블이 보이면 성공:

- `profiles`
- `posts`
- `comments`
- `reactions`
- `notifications`

추가로 **Database → Functions** 메뉴에서 `current_user_role`, `current_user_timeout_until`, `admin_set_role`, `mod_set_timeout`, `handle_new_user`, `notify_on_comment` 등이 보이면 0006까지 다 적용된 것입니다.

---

## 5단계. 본인을 관리자(admin)로 만들기

가입 직후의 모든 사용자는 `pending` 상태입니다. 본인을 admin으로 올려서 다른 사용자를 승인할 수 있게 만듭니다.

**5-1. 먼저 회원가입을 한 번 합니다.**

```powershell
npm run dev
```

브라우저 → <http://localhost:3000/signup> → 약관 동의 + 이메일/비번 입력 → 가입.

> 이 시점에는 자동으로 `profiles` row가 생성되지만 role이 `pending`이라 `/pending` 페이지로 튕깁니다. 정상입니다.

**5-2. Supabase에서 본인 UUID 확인**

대시보드 좌측 **Authentication → Users** → 방금 가입한 이메일 클릭 → 상단에 `UID` 값을 복사 (`abc12345-...` 형태).

**5-3. SQL 한 줄로 admin 승격**

**SQL Editor**에서 New query → 아래 SQL의 `<your-uuid>`를 본인 UID로 바꿔서 Run:

```sql
update public.profiles
set role = 'admin',
    nickname = 'admin',
    agreed_to_terms_at = now()
where id = '<your-uuid>';
```

`Success` 뜨면 끝.

**5-4. 새로고침해서 확인**

브라우저에서 사이트 새로고침. 이제 `/pending`이 아니라 메인 → `/board` 로 진입되고, 우측 상단/하단에 **관리자 메뉴(`/admin/users`)** 가 보입니다. 들어가서 다른 사용자(친구가 가입하면)를 `member`로 승격시킬 수 있어요.

---

## 6단계. 로컬 동작 확인 체크리스트

`npm run dev` 띄운 채로 다음 흐름이 다 되는지 보면 충분합니다:

- [ ] `/signup` 에서 새 계정 만들 수 있음
- [ ] 가입 직후 `/pending` 페이지로 이동
- [ ] admin 승격 후 새로고침하면 `/board` 진입
- [ ] `/onboarding`에서 닉네임/학년반 저장됨
- [ ] `/post/new` 에서 글 작성 → `/board` 목록에 보임
- [ ] 글 상세에서 댓글, 좋아요 작동
- [ ] 우측 상단 종 아이콘에 미확인 개수 뜸 (다른 사용자가 댓글 달면)
- [ ] `/me` 에서 로그아웃 가능
- [ ] `/admin/users` 에서 사용자 role 변경 가능

문제 생기면 어느 단계에서 뭐가 안 됐는지 알려주세요.

---

## 7단계. (다음 작업) Vercel 배포

로컬에서 다 잘 되면 무료 URL로 배포할 차례입니다. 별도 가이드로 정리합니다 — 지금은 6단계까지가 우선.

대략 흐름만:

1. 깃허브에 레포 푸시
2. <https://vercel.com> 에서 GitHub 로그인 → **Add New → Project** → 레포 선택
3. **Root Directory**를 `segyo-hub` 로 지정
4. **Environment Variables** 섹션에 3단계의 `.env.local` 키 3개를 그대로 추가
5. Deploy

---

## 자주 막히는 곳

**Q. `npm run dev`는 떴는데 페이지가 계속 placeholder처럼 동작해요.**
→ `.env.local` 키가 비어있거나 오타. 저장 후 dev 서버를 **반드시 재시작**(`Ctrl+C` → `npm run dev`).

**Q. SQL Run 했더니 `permission denied for schema auth` 같은 에러.**
→ Supabase **SQL Editor**가 아니라 다른 곳에서 돌렸을 가능성. 꼭 대시보드 안의 SQL Editor에서 실행하세요.

**Q. admin 승격 후에도 `/pending`으로 튕겨요.**
→ 브라우저에서 쿠키/세션이 캐시됐을 수 있습니다. 사이트 시크릿 창으로 다시 로그인하거나, `/me`로 가서 로그아웃 후 재로그인.

**Q. `service_role` 키를 깃에 실수로 커밋했어요.**
→ Supabase 대시보드 → Settings → API → **Reset service_role key** 즉시 누르고, 새 키로 `.env.local`과 Vercel env 둘 다 갱신.

---

질문/오류 메시지는 그대로 복사해서 보내주시면 됩니다.
