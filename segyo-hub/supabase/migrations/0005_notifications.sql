-- Notification kind enum (idempotent)
do $$ begin
  create type notification_kind as enum ('comment_on_post', 'reply_on_comment');
exception when duplicate_object then null;
end $$;

-- Notifications table
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind notification_kind not null,
  payload jsonb not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 읽지 않은 알림 빠른 조회용 부분 인덱스
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

-- RLS
alter table public.notifications enable row level security;

-- 본인 알림만 조회
drop policy if exists "notifications_self_select" on public.notifications;
create policy "notifications_self_select"
  on public.notifications for select using (auth.uid() = user_id);

-- 본인 알림만 업데이트 (read_at 토글용)
drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update"
  on public.notifications for update using (auth.uid() = user_id);

-- 댓글이 달리면 알림 생성하는 트리거 함수
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  parent_author uuid;
begin
  if new.parent_comment_id is null then
    -- 글에 달린 일반 댓글 → 글 작성자에게 알림
    select author_id into post_author from public.posts where id = new.post_id;
    if post_author is not null and post_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        post_author,
        'comment_on_post',
        jsonb_build_object('post_id', new.post_id, 'comment_id', new.id, 'actor_id', new.author_id)
      );
    end if;
  else
    -- 대댓글 → 부모 댓글 작성자에게 알림
    select author_id into parent_author from public.comments where id = new.parent_comment_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        parent_author,
        'reply_on_comment',
        jsonb_build_object(
          'post_id', new.post_id,
          'parent_comment_id', new.parent_comment_id,
          'comment_id', new.id,
          'actor_id', new.author_id
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();
