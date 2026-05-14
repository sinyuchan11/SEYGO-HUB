# Segyo Hub

세교중학교 친구 커뮤니티 (비공식, Phase 1).

## 개발

```bash
cd segyo-hub
npm install
cp .env.local.example .env.local  # 값 채우기
npm run dev
```

## 배포

Vercel에 연결해서 자동 배포 (main push 시).

### Vercel 설정
1. https://vercel.com/new 에서 GitHub repo 선택
2. **Root Directory**: `segyo-hub` (Next.js 앱이 그 안에 있음)
3. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

## Supabase 설정

`segyo-hub/supabase/README.md` 를 참고하세요.

## 문서

- 설계: `docs/superpowers/specs/2026-05-07-segyo-hub-design.md`
- Phase 1 계획: `docs/superpowers/plans/2026-05-07-segyo-hub-phase1-foundation.md`

## 테스트

```bash
cd segyo-hub
npm test
```
