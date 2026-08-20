-- DM 비속어 마스킹.
-- 0016 의 tg_mask_profanity 에 messages 분기를 추가하고 트리거를 건다.
--
-- 우회 의심 알림(profanity_evasion)은 DM 에는 보내지 않는다. 그 알림은 관리자가
-- 해당 글/댓글로 찾아가 보라는 뜻인데, DM 은 당사자 둘만 볼 수 있어야 하므로
-- 관리자에게 대화를 들여다볼 단서를 주는 게 맞지 않는다. 마스킹만 한다.

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
  if tg_table_name = 'messages' then
    -- 마스킹만 하고 끝. 관리자 알림 없음(위 주석 참고).
    new.body := public.mask_profanity(new.body);
    return new;
  elsif tg_table_name = 'posts' then
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

drop trigger if exists messages_mask_profanity on public.messages;
create trigger messages_mask_profanity
  before insert or update of body on public.messages
  for each row execute function public.tg_mask_profanity();
