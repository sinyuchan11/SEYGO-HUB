-- 비속어 우회 의심 → 관리자 알림 (로드맵 #6)
-- 글/댓글 저장 시 '우회 의심'이면 admin 전원에게 알림을 생성한다.
--   우회 의심 = 정규화로는 비속어가 감지되는데(contains_profanity), 원문에 '음절형' 금지어가
--   그대로 들어있지는 않은 경우 → 띄어쓰기("시 발")·초성("ㅅㅂ")·늘려쓰기("씨이이이발")·
--   기호삽입("씨*발") 등으로 우회한 것으로 본다. 직접 쓴 욕은 마스킹만 하고 알림은 보내지 않는다.

-- 새 enum 값을 참조하는 함수를 같은 실행 내에서 정의하므로, 함수 본문 검증을 꺼
-- "unsafe use of new value" 오류를 피한다 (런타임에는 값이 커밋되어 있어 정상 동작).
set check_function_bodies = off;

-- 1) 알림 종류 추가
alter type notification_kind add value if not exists 'profanity_evasion';

-- 2) 우회 의심 판정 함수
create or replace function public.is_profanity_evasion(input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.contains_profanity(input)
     and not exists (
       select 1 from public.banned_words
       where char_length(word) > 0
         and word !~ '[ㄱ-ㅣ]'                    -- 음절형(초성체가 아닌) 금지어만
         and strpos(lower(input), lower(word)) > 0 -- 원문에 그대로 포함되면 '직접'(우회 아님)
     );
$$;
revoke all on function public.is_profanity_evasion(text) from public;
grant execute on function public.is_profanity_evasion(text) to authenticated;

-- 3) 마스킹 트리거 함수 재정의: 마스킹 + (INSERT 시) 우회 의심이면 admin 알림
--    notifications INSERT는 RLS를 우회해야 하므로 security definer로 승격.
create or replace function public.tg_mask_profanity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_text text;
  tgt_type text;
  p_id bigint;
  c_id bigint;
begin
  if tg_table_name = 'posts' then
    raw_text := coalesce(new.title, '') || ' ' || coalesce(new.content, '');
    tgt_type := 'post'; p_id := new.id; c_id := null;
    new.title := public.mask_profanity(new.title);
    new.content := public.mask_profanity(new.content);
  elsif tg_table_name = 'comments' then
    raw_text := coalesce(new.content, '');
    tgt_type := 'comment'; p_id := new.post_id; c_id := new.id;
    new.content := public.mask_profanity(new.content);
  else
    return new;
  end if;

  if tg_op = 'INSERT' and public.is_profanity_evasion(raw_text) then
    insert into public.notifications (user_id, kind, payload)
    select pr.id,
           'profanity_evasion',
           jsonb_build_object(
             'target_type', tgt_type,
             'post_id', p_id,
             'comment_id', c_id,
             'actor_id', new.author_id
           )
    from public.profiles pr
    where pr.role = 'admin' and pr.id <> new.author_id;
  end if;

  return new;
end;
$$;

-- 트리거 자체는 0012에서 생성됨(before insert or update). 함수만 교체되므로 재생성 불필요.
