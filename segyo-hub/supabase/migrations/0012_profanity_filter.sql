-- 자동 욕설 필터 (로드맵 #6)
-- 글/댓글 저장 시 서버(DB 트리거)에서 비속어를 마스킹한다. 관리자가 금지어를
-- banned_words 테이블에서 직접 관리하며, 클라이언트는 contains_profanity RPC로
-- 작성 전 경고를 표시한다. 탐지/마스킹은 동일 로직(mask_profanity)이라 항상 일관된다.

-- 1) 금지어 테이블 (admin 전용 관리)

create table if not exists public.banned_words (
  id         bigserial primary key,
  word       text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.banned_words enable row level security;

-- 목록은 admin에게만 노출 (일반 사용자는 RPC로만 탐지하므로 목록 접근 불필요)
drop policy if exists "banned_words_admin_select" on public.banned_words;
create policy "banned_words_admin_select"
  on public.banned_words for select
  using (public.current_user_role() = 'admin');

drop policy if exists "banned_words_admin_insert" on public.banned_words;
create policy "banned_words_admin_insert"
  on public.banned_words for insert
  with check (public.current_user_role() = 'admin');

drop policy if exists "banned_words_admin_delete" on public.banned_words;
create policy "banned_words_admin_delete"
  on public.banned_words for delete
  using (public.current_user_role() = 'admin');

-- 2) 기본 한국어 비속어 사전 시드 (관리자가 이후 추가/삭제 가능)

insert into public.banned_words (word) values
  ('씨발'), ('시발'), ('씨팔'), ('씨바'), ('시바'), ('씨발놈'), ('시발놈'),
  ('씨발년'), ('개새끼'), ('개새기'), ('개색기'), ('개색끼'), ('새끼'),
  ('병신'), ('븅신'), ('지랄'), ('존나'), ('존내'), ('좆'), ('좆같'),
  ('개소리'), ('썅'), ('쌍놈'), ('미친놈'), ('미친년'), ('엿먹어'),
  ('보지'), ('자지'), ('걸레년'), ('창녀'), ('썅년'),
  ('fuck'), ('shit'), ('bitch'), ('asshole')
on conflict (word) do nothing;

-- 3) 마스킹 함수: banned_words를 순회하며 대소문자 무시 리터럴 치환.
--    매칭 부분을 글자 수만큼 '*'로 바꾼다. SECURITY DEFINER라 RLS와 무관하게
--    목록을 읽어 모든 사용자 대상 동작한다. regex 이스케이프 이슈를 피하려고
--    strpos 기반 리터럴 매칭을 사용한다.

create or replace function public.mask_profanity(input text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result text := input;
  w      record;
  wlen   int;
  pos    int;
  guard  int;
begin
  if input is null then
    return input;
  end if;

  for w in select word from public.banned_words loop
    wlen := char_length(w.word);
    if wlen = 0 then
      continue;
    end if;

    guard := 0;
    loop
      pos := strpos(lower(result), lower(w.word));
      exit when pos = 0;
      result := left(result, pos - 1) || repeat('*', wlen) || substr(result, pos + wlen);
      guard := guard + 1;
      exit when guard > 1000; -- 안전장치 (무한루프 방지)
    end loop;
  end loop;

  return result;
end;
$$;

revoke all on function public.mask_profanity(text) from public;
grant execute on function public.mask_profanity(text) to authenticated;

-- 4) 탐지 함수: 마스킹 결과가 원문과 다르면 비속어 포함. 클라이언트 경고용 RPC.
--    boolean만 반환하므로 금지어 목록이 노출되지 않는다.

create or replace function public.contains_profanity(input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.mask_profanity(input) is distinct from input;
$$;

revoke all on function public.contains_profanity(text) from public;
grant execute on function public.contains_profanity(text) to authenticated;

-- 5) 트리거: 글/댓글 저장 직전 항상 마스킹. RLS를 우회해 직접 insert해도 적용된다.

create or replace function public.tg_mask_profanity()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'posts' then
    new.title := public.mask_profanity(new.title);
    new.content := public.mask_profanity(new.content);
  elsif tg_table_name = 'comments' then
    new.content := public.mask_profanity(new.content);
  end if;
  return new;
end;
$$;

drop trigger if exists posts_mask_profanity on public.posts;
create trigger posts_mask_profanity
  before insert or update of title, content on public.posts
  for each row execute function public.tg_mask_profanity();

drop trigger if exists comments_mask_profanity on public.comments;
create trigger comments_mask_profanity
  before insert or update of content on public.comments
  for each row execute function public.tg_mask_profanity();
