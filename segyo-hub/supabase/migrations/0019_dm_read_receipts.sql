-- DM 읽음 표시 (로드맵 #9 보강)
-- 읽음 표시를 하려면 상대의 conversation_reads.last_read_at을 볼 수 있어야 한다.
-- select 정책을 '대화 참여자면 그 대화의 모든 읽음 기록 조회 가능'으로 확장하고,
-- 실시간으로 읽음 상태를 반영하기 위해 conversation_reads를 발행에 추가한다.

drop policy if exists "conversation_reads_select" on public.conversation_reads;
create policy "conversation_reads_select" on public.conversation_reads for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (auth.uid() = c.user_lo or auth.uid() = c.user_hi)
    )
  );

-- UPDATE 이벤트에서 RLS 평가/전달이 되도록 전체 행을 복제 식별자로 사용
alter table public.conversation_reads replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.conversation_reads;
exception when duplicate_object then null; end $$;
