-- 0027: 익명 글/댓글의 작성자가 클라이언트로 새지 않게 막는다.
--
-- 문제: RLS 는 "행" 단위라 열을 가릴 수 없다. member 는 posts/comments 의 author_id 와
-- profiles 의 nickname·grade_class 를 모두 읽을 수 있었고, anon key 는 원래 공개값이라
-- 개발자 도구에서 아래 한 줄이면 익명 글 작성자를 전부 뽑을 수 있었다.
--   /rest/v1/posts?is_anonymous=eq.true&select=title,author:profiles(nickname,grade_class)
-- board_posts() 도 익명 여부와 상관없이 닉네임·아바타를 돌려줬다.
--
-- 해결:
--   1) posts/comments 의 author_id 열 SELECT 권한을 클라이언트 역할에서 회수한다.
--      (INSERT 는 그대로. RLS 정책식은 열 권한 검사 대상이 아니라 작성자 수정/삭제도 그대로 동작)
--   2) 작성자 정보가 필요한 곳은 security definer 함수로만 받는다. 익명이면 작성자를 비워서 준다.
--   3) 익명 댓글 알림에 actor_id 를 넣지 않는다(기존 알림에서도 지운다).

-- 1) author_id 열 권한 회수 -------------------------------------------------
revoke select on public.posts    from anon, authenticated;
revoke select on public.comments from anon, authenticated;

grant select (id, board, title, content, is_anonymous, created_at, updated_at, deleted_at)
  on public.posts to authenticated;
grant select (id, post_id, parent_comment_id, content, is_anonymous, created_at, updated_at, deleted_at)
  on public.comments to authenticated;

-- 2-a) 글 상세 ------------------------------------------------------------------
create or replace function public.post_view(p_post_id bigint)
returns table (
  id              bigint,
  title           text,
  content         text,
  board           text,
  is_anonymous    boolean,
  created_at      timestamptz,
  author_id       uuid,     -- 익명이면 null (본인 글이어도 null. 본인 여부는 is_mine 으로)
  author_nickname text,     -- 익명이면 null
  is_mine         boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.title, p.content, p.board::text, p.is_anonymous, p.created_at,
    case when p.is_anonymous then null else p.author_id end,
    case when p.is_anonymous then null else pr.nickname end,
    p.author_id = auth.uid()
  from public.posts p
  left join public.profiles pr on pr.id = p.author_id
  where p.id = p_post_id
    and p.deleted_at is null
    and public.current_user_role() in ('member', 'moderator', 'admin');
$$;

revoke all on function public.post_view(bigint) from public, anon;
grant execute on function public.post_view(bigint) to authenticated;

-- 2-b) 글의 댓글 목록 ------------------------------------------------------------
-- is_post_author: 익명 글에서 글쓴이가 단 (익명) 댓글인지. 익명끼리만 잇는 정보라 실명은 드러나지 않는다.
drop function if exists public.post_comments(bigint);
create function public.post_comments(p_post_id bigint)
returns table (
  id                bigint,
  parent_comment_id bigint,
  content           text,
  is_anonymous      boolean,
  created_at        timestamptz,
  author_nickname   text,    -- 익명이면 null
  author_avatar_url text,    -- 익명이면 null
  is_mine           boolean,
  is_post_author    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.parent_comment_id, c.content, c.is_anonymous, c.created_at,
    case when c.is_anonymous then null else pr.nickname end,
    case when c.is_anonymous then null else pr.avatar_url end,
    c.author_id = auth.uid(),
    (p.is_anonymous and c.is_anonymous and c.author_id = p.author_id)
  from public.comments c
  join public.posts p on p.id = c.post_id
  left join public.profiles pr on pr.id = c.author_id
  where c.post_id = p_post_id
    and c.deleted_at is null
    and public.current_user_role() in ('member', 'moderator', 'admin')
  order by c.created_at asc, c.id asc;
$$;

revoke all on function public.post_comments(bigint) from public, anon;
grant execute on function public.post_comments(bigint) to authenticated;

-- 2-c) 특정 사용자가 쓴 글(익명 제외) — /u/[id]/posts --------------------------
create or replace function public.user_posts(
  p_user   uuid,
  p_limit  int default 20,
  p_offset int default 0
)
returns table (
  id           bigint,
  title        text,
  content      text,
  is_anonymous boolean,
  created_at   timestamptz,
  total_count  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.title, p.content, p.is_anonymous, p.created_at, count(*) over ()
  from public.posts p
  where p.author_id = p_user
    and p.is_anonymous = false
    and p.deleted_at is null
    and public.current_user_role() in ('member', 'moderator', 'admin')
  order by p.created_at desc, p.id desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke all on function public.user_posts(uuid, int, int) from public, anon;
grant execute on function public.user_posts(uuid, int, int) to authenticated;

-- 2-d) 게시판 목록: 익명이면 닉네임·아바타를 비운다 --------------------------------
-- author_id 열 권한이 사라지므로 security definer 로 바꾸고, RLS 대신 역할을 직접 확인한다.
create or replace function public.board_posts(
  p_board  text default 'all',
  p_q      text default '',
  p_sort   text default 'latest',
  p_limit  int  default 20,
  p_offset int  default 0
)
returns table (
  id                bigint,
  title             text,
  content           text,
  is_anonymous      boolean,
  created_at        timestamptz,
  author_nickname   text,
  author_avatar_url text,
  comment_count     int,
  like_count        int,
  total_count       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select p.id, p.title, p.content, p.is_anonymous, p.created_at, p.author_id
    from public.posts p
    where p.deleted_at is null
      and public.current_user_role() in ('member', 'moderator', 'admin')
      and (p_board = 'all' or p.board::text = p_board)
      and (p_q = '' or p.title ilike '%' || p_q || '%')
  ),
  counted as (
    select
      b.*,
      (select count(*)::int from public.comments c
        where c.post_id = b.id and c.deleted_at is null)          as comment_count,
      (select count(*)::int from public.reactions r
        where r.target_type = 'post' and r.target_id = b.id)      as like_count,
      count(*) over ()                                            as total_count
    from base b
  )
  select
    c.id, c.title, c.content, c.is_anonymous, c.created_at,
    case when c.is_anonymous then null else pr.nickname end,
    case when c.is_anonymous then null else pr.avatar_url end,
    c.comment_count, c.like_count, c.total_count
  from counted c
  left join public.profiles pr on pr.id = c.author_id
  order by
    case when p_sort = 'popular' then c.like_count + c.comment_count end desc nulls last,
    c.created_at desc,
    c.id desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke all on function public.board_posts(text, text, text, int, int) from public, anon;
grant execute on function public.board_posts(text, text, text, int, int) to authenticated;

-- 3) 익명 댓글 알림에서 actor_id 빼기 ------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  parent_author uuid;
  actor jsonb := case when new.is_anonymous then '{}'::jsonb
                      else jsonb_build_object('actor_id', new.author_id) end;
begin
  if new.parent_comment_id is null then
    select author_id into post_author from public.posts where id = new.post_id;
    if post_author is not null and post_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        post_author,
        'comment_on_post',
        jsonb_build_object('post_id', new.post_id, 'comment_id', new.id) || actor
      );
    end if;
  else
    select author_id into parent_author from public.comments where id = new.parent_comment_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (user_id, kind, payload)
      values (
        parent_author,
        'reply_on_comment',
        jsonb_build_object(
          'post_id', new.post_id,
          'parent_comment_id', new.parent_comment_id,
          'comment_id', new.id
        ) || actor
      );
    end if;
  end if;
  return new;
end;
$$;

-- 이미 쌓인 알림 중 익명 댓글/글에서 온 것의 actor_id 제거
update public.notifications n
   set payload = n.payload - 'actor_id'
 where n.payload ? 'actor_id'
   and n.kind <> 'profanity_evasion'
   and (
     exists (select 1 from public.comments c
              where c.id = (n.payload->>'comment_id')::bigint and c.is_anonymous)
     or (not (n.payload ? 'comment_id') and exists (
           select 1 from public.posts p
            where p.id = (n.payload->>'post_id')::bigint and p.is_anonymous))
   );

-- 4) 익명 글의 글쓴이가 단 댓글은 자동으로 익명 ------------------------------------------
-- 질문 글에 글쓴이가 댓글로 덧붙이면 닉네임이 찍혀 익명이 깨졌다.
create or replace function public.tg_anon_post_author_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.posts p
              where p.id = new.post_id and p.is_anonymous and p.author_id = new.author_id) then
    new.is_anonymous := true;
  end if;
  return new;
end; $$;

drop trigger if exists comments_anon_post_author on public.comments;
create trigger comments_anon_post_author
  before insert on public.comments
  for each row execute function public.tg_anon_post_author_comment();

-- 5) 실명 글을 익명으로 바꾸면, 이미 드러난 흔적을 지운다 ---------------------------------
--    글쓴이의 기존 댓글을 익명으로, 이 글에서 글쓴이 id 가 실린 알림에서 actor_id 를 뺀다.
create or replace function public.tg_post_became_anonymous()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_anonymous and not old.is_anonymous then
    update public.comments
       set is_anonymous = true
     where post_id = new.id and author_id = new.author_id and not is_anonymous;

    update public.notifications
       set payload = payload - 'actor_id'
     where payload->>'post_id' = new.id::text
       and payload->>'actor_id' = new.author_id::text
       and kind <> 'profanity_evasion';
  end if;
  return new;
end; $$;

drop trigger if exists posts_became_anonymous on public.posts;
create trigger posts_became_anonymous
  after update of is_anonymous on public.posts
  for each row execute function public.tg_post_became_anonymous();

-- 기존 데이터: 익명 글에 글쓴이가 단 실명 댓글을 익명으로
update public.comments c
   set is_anonymous = true
  from public.posts p
 where p.id = c.post_id and p.is_anonymous and c.author_id = p.author_id and not c.is_anonymous;

-- 위에서 익명이 된 댓글의 알림에서도 actor_id 제거
update public.notifications n
   set payload = n.payload - 'actor_id'
 where n.payload ? 'actor_id'
   and n.kind <> 'profanity_evasion'
   and exists (select 1 from public.comments c
                where c.id = (n.payload->>'comment_id')::bigint and c.is_anonymous);
