-- Board kind enum (idempotent)
do $$ begin
  create type board_kind as enum ('free', 'notice', 'qna', 'anon');
exception when duplicate_object then null;
end $$;

-- Posts table
create table if not exists public.posts (
  id bigserial primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  board board_kind not null default 'free',
  title text not null,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists posts_board_created_idx
  on public.posts (board, created_at desc)
  where deleted_at is null;

create index if not exists posts_author_idx
  on public.posts (author_id);

-- updated_at 자동 갱신 트리거
drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.posts enable row level security;

-- 멤버 이상만 게시글 조회 가능
drop policy if exists "posts_member_select" on public.posts;
create policy "posts_member_select"
  on public.posts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 멤버 이상이고 타임아웃 아닌 경우만 작성 가능
-- notice 게시판은 모더/어드민만 작성 가능
drop policy if exists "posts_member_insert" on public.posts;
create policy "posts_member_insert"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
      and (p.timeout_until is null or p.timeout_until <= now())
    )
    and (
      board <> 'notice'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.role in ('moderator', 'admin')
      )
    )
  );

-- 작성자 본인이 자기 게시글 수정 (삭제되지 않은 경우)
drop policy if exists "posts_author_update" on public.posts;
create policy "posts_author_update"
  on public.posts for update
  using (auth.uid() = author_id and deleted_at is null);

-- 모더/어드민은 모든 게시글 수정 가능 (소프트 삭제 포함)
drop policy if exists "posts_mod_update" on public.posts;
create policy "posts_mod_update"
  on public.posts for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin')
    )
  );
