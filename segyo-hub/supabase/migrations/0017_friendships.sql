-- 친구 시스템 (로드맵 #8)
-- friendships: 한 관계당 1행. requester가 addressee에게 요청(pending) → addressee가 수락(accepted).
-- 거절/취소/끊기 = 행 삭제. 무방향 유일성으로 A→B, B→A 중복을 막는다.
-- 요청/수락 시 기존 notifications 테이블로 알림 생성.

-- 새 enum 값을 참조하는 트리거 함수를 같은 실행에서 정의하므로 본문 검증을 끈다.
set check_function_bodies = off;

create table if not exists public.friendships (
  id           bigserial primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- 무방향 유일성: (A,B)와 (B,A)를 같은 것으로 취급
create unique index if not exists friendships_pair_uniq
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and public.current_user_role() in ('member', 'moderator', 'admin')
  );

-- addressee만 수락 가능 (pending → accepted)
drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

-- 양쪽 다 삭제 가능 (취소/거절/끊기)
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- 알림 종류 추가
alter type notification_kind add value if not exists 'friend_request';
alter type notification_kind add value if not exists 'friend_accept';

-- 요청 생성 → addressee에게 알림
create or replace function public.notify_on_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, payload)
  values (
    new.addressee_id, 'friend_request',
    jsonb_build_object('actor_id', new.requester_id, 'friendship_id', new.id)
  );
  return new;
end; $$;

drop trigger if exists friendships_notify_request on public.friendships;
create trigger friendships_notify_request
  after insert on public.friendships
  for each row execute function public.notify_on_friend_request();

-- 수락(pending→accepted) → requester에게 알림
create or replace function public.notify_on_friend_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, kind, payload)
    values (
      new.requester_id, 'friend_accept',
      jsonb_build_object('actor_id', new.addressee_id, 'friendship_id', new.id)
    );
  end if;
  return new;
end; $$;

drop trigger if exists friendships_notify_accept on public.friendships;
create trigger friendships_notify_accept
  after update on public.friendships
  for each row execute function public.notify_on_friend_accept();
