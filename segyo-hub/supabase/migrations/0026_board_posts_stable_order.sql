-- board_posts() 정렬에 동점 해소 기준(id desc)을 추가한다.
--
-- 0024 의 order by 는 created_at desc 까지만이라 같은 시각의 글들 사이 순서가
-- 정해져 있지 않다. offset 페이징에서 순서가 정해져 있지 않으면 페이지마다 다른
-- 순서가 나와 같은 글이 두 페이지에 걸치거나 아예 빠질 수 있다.
-- 실제로 겹침/누락이 관측되진 않았지만(같은 마이크로초 삽입이라야 걸린다),
-- 기준을 못 박아 두는 편이 맞다.

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
    c.created_at desc,
    c.id desc                                    -- 동점이어도 순서가 흔들리지 않게
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

revoke all on function public.board_posts(text, text, text, int, int) from public;
grant execute on function public.board_posts(text, text, text, int, int) to authenticated;
