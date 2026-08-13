-- 멘션(@) (로드맵 #10)
-- 글/댓글 본문의 평문 `@닉네임`을 실제 닉네임 목록과 대조해 멘션 알림을 만든다.
-- 자동완성으로 넣었든 직접 타이핑했든 저장 형태가 같으므로 경로가 하나로 합쳐진다.
-- 알림 대상 판정은 전적으로 여기(서버)에서 한다 — 클라이언트가 대상 id를 보내면 알림 스팸이 가능하다.

-- 새 enum 값을 참조하는 트리거 함수를 같은 실행에서 정의하므로 본문 검증을 끈다.
set check_function_bodies = off;

alter type notification_kind add value if not exists 'mention';

-- `@닉네임`이 경계 위치에 등장하는지 검사한다.
-- 정규식에 닉네임을 끼워 넣지 않는 이유: 닉네임에 형식 제약이 없어(`.`, `*`, `(` 등 가능)
-- 이스케이프 처리가 필요해지고, 놓치면 오작동한다. 문자열 함수로 훑는 편이 안전하다.
create or replace function public.mention_hit(t text, nick text)
returns boolean language plpgsql immutable as $$
declare
  needle text := '@' || nick;
  pos    int  := 1;
  found  int;
  prev   text;
begin
  if nick is null or nick = '' then
    return false;
  end if;

  loop
    found := strpos(substr(t, pos), needle);
    exit when found = 0;
    found := pos + found - 1;                  -- '@'의 절대 위치

    if found = 1 then
      return true;                             -- 문자열 시작
    end if;

    prev := substr(t, found - 1, 1);
    if prev !~ '[[:alnum:]_]' then
      return true;                             -- 앞이 공백/구두점 → 이메일 a@b.com 오탐 방지
    end if;

    pos := found + 1;
  end loop;

  return false;
end; $$;

-- 본문에서 멘션된 프로필 id 목록. exclude_ids(작성자, 이미 다른 알림을 받는 사람)는 뺀다.
create or replace function public.mentioned_profile_ids(
  content     text,
  exclude_ids uuid[] default '{}'
)
returns uuid[] language sql stable security definer set search_path = public as $$
  with plain as (
    -- HTML 태그 제거: 글 본문의 href·alt 속성에 들어간 @가 멘션으로 잡히면 안 된다.
    select regexp_replace(coalesce(content, ''), '<[^>]*>', ' ', 'g') as t
  ),
  hits as (
    select p.id, p.nickname
    from public.profiles p, plain
    where p.nickname is not null
      and public.mention_hit(plain.t, p.nickname)
  )
  select coalesce(array_agg(h.id), '{}'::uuid[])
  from hits h
  where not (h.id = any(exclude_ids))
    -- 최장일치 근사: 더 긴 닉네임도 함께 걸렸다면 짧은 쪽(접두사)은 버린다.
    and not exists (
      select 1 from hits o
      where o.id <> h.id
        and o.nickname <> h.nickname
        and starts_with(o.nickname, h.nickname)
    );
$$;

revoke all on function public.mention_hit(text, text) from public;
revoke all on function public.mentioned_profile_ids(text, uuid[]) from public;

-- 글 작성 → 본문에 멘션된 사람에게 알림
create or replace function public.notify_mentions_on_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  foreach target in array public.mentioned_profile_ids(new.content, array[new.author_id]) loop
    insert into public.notifications (user_id, kind, payload)
    values (
      target, 'mention',
      case when new.is_anonymous
        then jsonb_build_object('post_id', new.id)          -- 익명이면 작성자를 노출하지 않는다
        else jsonb_build_object('post_id', new.id, 'actor_id', new.author_id)
      end
    );
  end loop;
  return new;
end; $$;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
  after insert on public.posts
  for each row execute function public.notify_mentions_on_post();

-- 댓글 작성 → 멘션 알림.
-- 이미 comment_on_post / reply_on_comment 알림을 받는 사람에게는 중복해서 보내지 않는다.
create or replace function public.notify_mentions_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target   uuid;
  other    uuid;
  excluded uuid[] := array[new.author_id];
begin
  if new.parent_comment_id is null then
    select author_id into other from public.posts where id = new.post_id;
  else
    select author_id into other from public.comments where id = new.parent_comment_id;
  end if;

  if other is not null then
    excluded := excluded || other;
  end if;

  foreach target in array public.mentioned_profile_ids(new.content, excluded) loop
    insert into public.notifications (user_id, kind, payload)
    values (
      target, 'mention',
      case when new.is_anonymous
        then jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
        else jsonb_build_object('post_id', new.post_id, 'comment_id', new.id, 'actor_id', new.author_id)
      end
    );
  end loop;
  return new;
end; $$;

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function public.notify_mentions_on_comment();
