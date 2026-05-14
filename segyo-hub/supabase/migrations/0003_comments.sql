-- Comments table (with 2-level depth limit enforced via trigger)
create table if not exists public.comments (
  id bigserial primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id bigint references public.comments(id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists comments_post_idx
  on public.comments (post_id, created_at);

create index if not exists comments_parent_idx
  on public.comments (parent_comment_id);

create index if not exists comments_author_idx
  on public.comments (author_id);

-- updated_at 자동 갱신 트리거
drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

-- 댓글 깊이 제한: 댓글 → 대댓글까지만 (2단계 초과 금지)
create or replace function public.enforce_comment_depth()
returns trigger language plpgsql as $$
declare
  parent_parent bigint;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select parent_comment_id into parent_parent
  from public.comments where id = new.parent_comment_id;
  if parent_parent is not null then
    raise exception '대댓글까지만 가능해요 (2단계 초과 금지)';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_enforce_depth on public.comments;
create trigger comments_enforce_depth
  before insert on public.comments
  for each row execute function public.enforce_comment_depth();

-- RLS
alter table public.comments enable row level security;

-- 멤버 이상만 댓글 조회 가능
drop policy if exists "comments_member_select" on public.comments;
create policy "comments_member_select"
  on public.comments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 멤버 이상이고 타임아웃 아닌 경우만 작성 가능
drop policy if exists "comments_member_insert" on public.comments;
create policy "comments_member_insert"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
      and (p.timeout_until is null or p.timeout_until <= now())
    )
  );

-- 작성자 본인이 자기 댓글 수정 (삭제되지 않은 경우)
drop policy if exists "comments_author_update" on public.comments;
create policy "comments_author_update"
  on public.comments for update
  using (auth.uid() = author_id and deleted_at is null);

-- 모더/어드민은 모든 댓글 수정 가능 (소프트 삭제 포함)
drop policy if exists "comments_mod_update" on public.comments;
create policy "comments_mod_update"
  on public.comments for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin')
    )
  );
