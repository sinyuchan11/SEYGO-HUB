# Supabase 설정 가이드

이 폴더의 SQL 마이그레이션을 Supabase 프로젝트에 적용하는 방법입니다.

## 1) 프로젝트 생성

1. <https://supabase.com> 에 로그인 후 **New project** 클릭
2. Region은 가까운 곳(예: `Northeast Asia (Seoul)`) 선택
3. 생성 후 **Project Settings → API** 메뉴로 이동

## 2) 환경변수

`segyo-hub/.env.local` 에 아래 3개 키를 채워 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
```

- `service_role` 키는 **서버 전용**입니다. 절대 클라이언트 코드에 노출하지 마세요.

## 3) 마이그레이션 실행

Supabase Studio → **SQL Editor** 에서 `migrations/` 폴더의 SQL 파일을 **파일명 순서대로** 붙여넣고 Run 합니다.

- `0001_profiles.sql` — profiles 테이블 + RLS + RPC
- 이후 `0002_*.sql`, `0003_*.sql` 가 추가되면 같은 방식으로 차례대로 실행

## 4) admin 시드

1. Supabase Studio → **Authentication → Users** 에서 본인 계정을 Email로 생성 (또는 OAuth 로그인 후 자동 생성된 row 확인)
2. 해당 user의 UUID 복사
3. **SQL Editor** 에서 아래 쿼리 실행 (UUID는 본인 것으로 교체):

```sql
update public.profiles
set role = 'admin',
    nickname = 'admin',
    agreed_to_terms_at = now()
where id = '<your-uuid>';
```

## 5) (선택) 타입 생성

Supabase CLI로 TypeScript 타입을 생성하려면:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > types/database.ts
```

타입이 없는 동안은 호출부에서 `any` 캐스트로 임시 대응합니다.
