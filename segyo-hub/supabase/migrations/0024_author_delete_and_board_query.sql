-- 0024
-- 1) 작성자가 자기 글/댓글을 삭제하지 못하던 버그 수정.
--    posts_author_update / comments_author_update 는 USING 만 있고 WITH CHECK 가 없었다.
--    Postgres 는 이때 USING 식을 "새 행"에도 적용하므로, deleted_at 을 채우는 순간
--    `deleted_at is null` 을 위반해 42501 로 거절됐다. 관리자/모더는 별도의
--    *_mod_update 정책으로 통과해서 지금껏 드러나지 않았다.
-- 2) 삭제된 글에 댓글이 달리던 구멍 막기.
-- 3) 게시판 목록을 DB 에서 세고·정렬·페이징하는 board_posts().
--    기존엔 최근 50건을 가져와 JS 로 정렬해서 "인기순"이 사실 "최근 50건 중 인기순"이었고,
--    51번째 글부터는 목록에 영원히 안 나왔다.
-- 4) 알림 실시간 발행 (알림 벨이 30초 폴링만 하던 문제).

-- ---------------------------------------------------------------- 1) 작성자 삭제

drop policy if exists "posts_author_update" on public.posts;
create policy "posts_author_update"
  on public.posts for update
  using (auth.uid() = author_id and deleted_at is null)
  with check (
    auth.uid() = author_id
    -- 공지는 모더/관리자만. insert 정책과 같은 규칙을 update 에도 건다.
    and (board <> 'notice' or public.current_user_role() in ('moderator', 'admin'))
  );

drop policy if exists "comments_author_update" on public.comments;
create policy "comments_author_update"
  on public.comments for update
  using (auth.uid() = author_id and deleted_at is null)
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------- 2) 삭제된 글 댓글 차단

drop policy if exists "comments_member_insert" on public.comments;
create policy "comments_member_insert"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and public.current_user_role() in ('member', 'moderator', 'admin')
    and (
      public.current_user_timeout_until() is null
      or public.current_user_timeout_until() <= now()
    )
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.deleted_at is null
    )
  );

-- ---------------------------------------------------------------- 3) 게시판 목록

-- SECURITY INVOKER (기본값) 이므로 posts/comments/reactions/profiles 의 RLS 가 그대로 적용된다.
-- total_count 는 필터를 적용한 전체 건수 → 페이지네이션용.
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
set search_path = public
as $$
  with base as (
    select p.id, p.title, p.content, p.is_anonymous, p.created_at, p.author_id
    from public.posts p
    where p.deleted_at is null
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
    pr.nickname, pr.avatar_url,
    c.comment_count, c.like_count, c.total_count
  from counted c
  left join public.profiles pr on pr.id = c.author_id
  order by
    case when p_sort = 'popular' then c.like_count + c.comment_count end desc nulls last,
    c.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke all on function public.board_posts(text, text, text, int, int) from public;
grant execute on function public.board_posts(text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------- 4) 알림 실시간

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
