-- 멘션 알림을 항상 보낸다 (0021 규칙 변경)
-- 0021은 이미 comment_on_post / reply_on_comment 알림을 받는 사람에게는 mention을 생략했다.
-- 그 결과 "내 글에 달린 댓글에서 나를 멘션"한 흔한 경우에 멘션 알림이 아예 보이지 않아
-- 멘션이 묻혔다. 이제 작성자 본인(자기 멘션)만 제외하고 항상 보낸다.

create or replace function public.notify_mentions_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  foreach target in array public.mentioned_profile_ids(new.content, array[new.author_id]) loop
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
