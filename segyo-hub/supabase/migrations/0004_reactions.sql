-- Reaction target enum (idempotent)
do $$ begin
  create type reaction_target as enum ('post', 'comment');
exception when duplicate_object then null;
end $$;

-- Reactions table (likes on posts/comments)
create table if not exists public.reactions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type reaction_target not null,
  target_id bigint not null,
  created_at timestamptz not null default now(),
  unique(user_id, target_type, target_id)
);

create index if not exists reactions_target_idx
  on public.reactions (target_type, target_id);

-- RLS
alter table public.reactions enable row level security;

-- 멤버 이상만 좋아요 조회 가능
drop policy if exists "reactions_member_select" on public.reactions;
create policy "reactions_member_select"
  on public.reactions for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 본인 좋아요만 등록 가능 (멤버 이상)
drop policy if exists "reactions_self_insert" on public.reactions;
create policy "reactions_self_insert"
  on public.reactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('member', 'moderator', 'admin')
    )
  );

-- 본인 좋아요만 취소 가능
drop policy if exists "reactions_self_delete" on public.reactions;
create policy "reactions_self_delete"
  on public.reactions for delete
  using (auth.uid() = user_id);
