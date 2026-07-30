-- 공지 개편 (로드맵 #7 후속)
-- 공지는 더 이상 게시판 글(board='notice')로 작성하지 않고, 홈의 관리자 편집 카드로 운영한다.
-- info_cards에 'notice' 카드를 추가하면 /admin/info 편집 화면과 홈에 자동으로 나타난다.
insert into public.info_cards (key, title) values ('notice', '공지')
on conflict (key) do nothing;
