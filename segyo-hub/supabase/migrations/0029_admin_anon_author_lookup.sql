-- 0029: 관리자 익명 작성자 조회 + 조회 기록.
--
-- 0027 에서 익명 작성자는 관리자에게도 앱에서 보이지 않게 됐다. 신고 처리 등으로
-- 꼭 필요할 때만 관리자가 "사유를 적고" 조회하고, 조회할 때마다 기록이 남는다
-- (설계 문서 2026-05-07 §민감 액션 로그). 가입 동의 문구에 이미 고지돼 있다.
--
-- - 조회는 admin_reveal_anon_author() 로만 한다. admin 이 아니면 예외.
-- - 기록 테이블은 함수만 쓴다(클라이언트 INSERT/UPDATE/DELETE 불가). admin 만 읽는다.
-- - 기록은 지우거나 고칠 수 없게 해서 조회 이력을 숨길 수 없게 한다.

create table if not exists public.anon_author_lookups (
  id          bigint generated always as identity primary key,
  admin_id    uuid        constraint anon_author_lookups_admin_id_fkey
                          references public.profiles(id) on delete set null,
  target_type text        not null check (target_type in ('post', 'comment')),
  target_id   bigint      not null,
  post_id     bigint      not null,
  author_id   uuid        constraint anon_author_lookups_author_id_fkey
                          references public.profiles(id) on delete set null,
  reason      text        not null check (length(btrim(reason)) between 2 and 300),
  created_at  timestamptz not null default now()
);

create index if not exists anon_author_lookups_created_idx
  on public.anon_author_lookups (created_at desc);

alter table public.anon_author_lookups enable row level security;
revoke all on public.anon_author_lookups from anon, authenticated;
grant select on public.anon_author_lookups to authenticated;

drop policy if exists "anon_author_lookups_admin_select" on public.anon_author_lookups;
create policy "anon_author_lookups_admin_select"
  on public.anon_author_lookups for select
  using (public.current_user_role() = 'admin');

create or replace function public.admin_reveal_anon_author(
  p_target_type text,
  p_target_id   bigint,
  p_reason      text
)
returns table (
  author_id   uuid,
  nickname    text,
  grade_class text,
  avatar_url  text,
  role        user_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_anon   boolean;
  v_post   bigint;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception '관리자만 조회할 수 있어요.' using errcode = '42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 2 then
    raise exception '조회 사유를 2자 이상 적어 주세요.' using errcode = '22023';
  end if;

  if p_target_type = 'post' then
    select p.author_id, p.is_anonymous, p.id into v_author, v_anon, v_post
      from public.posts p where p.id = p_target_id;
  elsif p_target_type = 'comment' then
    select c.author_id, c.is_anonymous, c.post_id into v_author, v_anon, v_post
      from public.comments c where c.id = p_target_id;
  else
    raise exception '잘못된 대상이에요.' using errcode = '22023';
  end if;

  if v_post is null then
    raise exception '대상을 찾을 수 없어요.' using errcode = 'P0002';
  end if;
  if not v_anon then
    raise exception '익명 글/댓글이 아니에요.' using errcode = '22023';
  end if;

  insert into public.anon_author_lookups (admin_id, target_type, target_id, post_id, author_id, reason)
  values (auth.uid(), p_target_type, p_target_id, v_post, v_author, left(btrim(p_reason), 300));

  return query
    select pr.id, pr.nickname, pr.grade_class, pr.avatar_url, pr.role
      from public.profiles pr where pr.id = v_author;
end;
$$;

revoke all on function public.admin_reveal_anon_author(text, bigint, text) from public, anon;
grant execute on function public.admin_reveal_anon_author(text, bigint, text) to authenticated;
