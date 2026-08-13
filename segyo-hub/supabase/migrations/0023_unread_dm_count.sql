-- 안 읽은 DM 개수 (네비게이션 배지용)
-- 배지는 모든 페이지에 떠 있어서, 받은편지함처럼 대화·메시지·읽음 3개 테이블을 매번 긁으면 낭비다.
-- 판정 규칙은 lib/dm.ts의 isConversationUnread()와 동일하게 맞춘다:
--   마지막 메시지가 상대가 보낸 것이고, 내 last_read_at보다 나중이면 안 읽음.

create or replace function public.unread_dm_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.conversations c
  join lateral (
    select m.sender_id, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join public.conversation_reads r
    on r.conversation_id = c.id and r.user_id = auth.uid()
  where (c.user_lo = auth.uid() or c.user_hi = auth.uid())
    and lm.sender_id <> auth.uid()
    and (r.last_read_at is null or lm.created_at > r.last_read_at);
$$;

revoke all on function public.unread_dm_count() from public;
grant execute on function public.unread_dm_count() to authenticated;
