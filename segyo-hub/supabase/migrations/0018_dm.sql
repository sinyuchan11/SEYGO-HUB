-- 1:1 DM (로드맵 #9)
-- conversations(1:1 쌍당 1개) + messages + conversation_reads(안읽음).
-- 대화 생성 권한은 can_dm(친구 ∪ 관리자)로 게이트. 메시지는 Supabase Realtime으로 실시간 반영.

create table if not exists public.conversations (
  id              bigserial primary key,
  user_lo         uuid not null references public.profiles(id) on delete cascade,
  user_hi         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (user_lo, user_hi),
  check (user_lo < user_hi)
);

create index if not exists conversations_lo_idx on public.conversations (user_lo, last_message_at desc);
create index if not exists conversations_hi_idx on public.conversations (user_hi, last_message_at desc);

create table if not exists public.messages (
  id              bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create table if not exists public.conversation_reads (
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;

-- 참여자만 대화 조회 (insert/update는 RPC/트리거 definer로만)
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations for select
  using (auth.uid() = user_lo or auth.uid() = user_hi);

-- 참여자만 메시지 조회 / 본인이 보낸 것만 삽입
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (auth.uid() = c.user_lo or auth.uid() = c.user_hi)
  ));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (auth.uid() = c.user_lo or auth.uid() = c.user_hi)
    )
  );

-- 읽음 기록은 본인 것만
drop policy if exists "conversation_reads_select" on public.conversation_reads;
create policy "conversation_reads_select" on public.conversation_reads for select
  using (auth.uid() = user_id);
drop policy if exists "conversation_reads_insert" on public.conversation_reads;
create policy "conversation_reads_insert" on public.conversation_reads for insert
  with check (auth.uid() = user_id);
drop policy if exists "conversation_reads_update" on public.conversation_reads;
create policy "conversation_reads_update" on public.conversation_reads for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- DM 허용 판정: member+ 이고 (상대가 친구 or 상대가 admin or 내가 admin)
create or replace function public.can_dm(other uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if other is null or other = auth.uid() then
    return false;
  end if;
  if public.current_user_role() not in ('member', 'moderator', 'admin') then
    return false;
  end if;
  if public.current_user_role() = 'admin' then
    return true;
  end if;
  if (select role from public.profiles where id = other) = 'admin' then
    return true;
  end if;
  return exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = other)
        or (f.requester_id = other and f.addressee_id = auth.uid()))
  );
end;
$$;
revoke all on function public.can_dm(uuid) from public;
grant execute on function public.can_dm(uuid) to authenticated;

-- 대화 생성/조회 (정규화 쌍). can_dm 통과 시만.
create or replace function public.get_or_create_conversation(other uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  lo uuid; hi uuid; conv_id bigint;
begin
  if not public.can_dm(other) then
    raise exception 'forbidden';
  end if;
  lo := least(auth.uid(), other);
  hi := greatest(auth.uid(), other);
  insert into public.conversations (user_lo, user_hi) values (lo, hi)
  on conflict (user_lo, user_hi) do nothing;
  select id into conv_id from public.conversations where user_lo = lo and user_hi = hi;
  return conv_id;
end;
$$;
revoke all on function public.get_or_create_conversation(uuid) from public;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- 메시지 저장 시 대화의 last_message_at 갱신
create or replace function public.tg_bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_bump_conversation on public.messages;
create trigger messages_bump_conversation
  after insert on public.messages
  for each row execute function public.tg_bump_conversation();

-- Realtime: messages 테이블 발행 (이미 추가돼 있으면 무시)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
