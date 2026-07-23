-- 욕설 필터 보강 2 (로드맵 #6)
--  (1) 초성체(ㅅㅂ, ㅂㅅ 등)를 안전하게 검출: 음절에서 분해된 자모는 '조합형 자모'(U+1100~)로,
--      사용자가 직접 타이핑한 자모는 '호환 자모'(U+3131~)로 서로 다르게 정규화한다.
--      → 금지어 'ㅅㅂ'(호환)는 사용자가 초성으로 칠 때만 매칭되고, 정상어 "못보다"(음절 분해 →
--        조합형)는 건드리지 않는다.
--  (2) 패드립/성적 표현 기본 사전 추가.
-- 트리거와 contains_profanity는 그대로 재사용된다.

-- 1) 정규화 함수 재정의 (조합형 vs 호환 자모 구분)
create or replace function public.normalize_profanity(input text)
returns text
language plpgsql
immutable
as $$
declare
  n int; i int; c text; cp int; s int; ci int; ji int; ki int;
  buf text := ''; res text := ''; prev text := ''; ch text;
begin
  if input is null then return null; end if;
  n := char_length(input);
  for i in 1..n loop
    c := substr(input, i, 1); cp := ascii(c);
    if cp between 44032 and 55203 then                     -- 한글 음절 → 조합형 자모로 분해
      s := cp - 44032; ci := s / 588; ji := (s % 588) / 28; ki := s % 28;
      if ci <> 11 then buf := buf || chr(4352 + ci); end if;   -- 초성(U+1100~), ㅇ(11) 제거
      buf := buf || chr(4449 + ji);                            -- 중성(U+1161~)
      if ki <> 0 then buf := buf || chr(4519 + ki); end if;    -- 종성(U+11A8~)
    elsif cp between 12593 and 12643 then                  -- 타이핑된 호환 자모(ㅅㅂ 등)는 그대로 유지
      buf := buf || c;
    elsif cp between 65 and 90 then buf := buf || lower(c);
    elsif cp between 97 and 122 then buf := buf || c;
    end if;
  end loop;

  n := char_length(buf);
  for i in 1..n loop                                       -- 연속 중복 자모 축약
    ch := substr(buf, i, 1);
    if ch <> prev then res := res || ch; prev := ch; end if;
  end loop;
  return res;
end;
$$;

-- 2) 마스킹 함수 재정의 (동일 정규화 규칙 + 원문 위치 매핑)
create or replace function public.mask_profanity(input text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int; i int; c text; cp int; s int; ci int; ji int; ki int;
  jchars text[] := '{}'; jidx int[] := '{}';
  cj text := ''; cstart int[] := '{}'; cend int[] := '{}';
  clen int := 0; prev text := ''; jc text; oi int; k int;
  masked boolean[];
  w record; nword text; wlen int; pos int; startsearch int; a int; b int; os int; oe int;
  result text := '';
begin
  if input is null then return input; end if;
  n := char_length(input);
  if n = 0 then return input; end if;

  for i in 1..n loop
    c := substr(input, i, 1); cp := ascii(c);
    if cp between 44032 and 55203 then
      s := cp - 44032; ci := s / 588; ji := (s % 588) / 28; ki := s % 28;
      if ci <> 11 then jchars := jchars || chr(4352 + ci); jidx := jidx || i; end if;
      jchars := jchars || chr(4449 + ji); jidx := jidx || i;
      if ki <> 0 then jchars := jchars || chr(4519 + ki); jidx := jidx || i; end if;
    elsif cp between 12593 and 12643 then jchars := jchars || c; jidx := jidx || i;
    elsif cp between 65 and 90 then jchars := jchars || lower(c); jidx := jidx || i;
    elsif cp between 97 and 122 then jchars := jchars || c; jidx := jidx || i;
    end if;
  end loop;

  if array_length(jchars, 1) is null then return input; end if;

  for k in 1..array_length(jchars, 1) loop
    jc := jchars[k]; oi := jidx[k];
    if clen > 0 and jc = prev then cend[clen] := oi;
    else cj := cj || jc; clen := clen + 1; cstart[clen] := oi; cend[clen] := oi; prev := jc; end if;
  end loop;

  masked := array_fill(false, array[n]);

  for w in select word from public.banned_words loop
    nword := public.normalize_profanity(w.word);
    wlen := char_length(nword);
    if wlen = 0 then continue; end if;
    startsearch := 1;
    loop
      pos := strpos(substr(cj, startsearch), nword);
      exit when pos = 0;
      a := startsearch + pos - 1; b := a + wlen - 1;
      os := cstart[a]; oe := cend[b];
      for i in os..oe loop masked[i] := true; end loop;
      startsearch := a + 1;
    end loop;
  end loop;

  for i in 1..n loop
    if masked[i] then result := result || '*';
    else result := result || substr(input, i, 1); end if;
  end loop;

  return result;
end;
$$;

revoke all on function public.normalize_profanity(text) from public;
grant execute on function public.normalize_profanity(text) to authenticated;
revoke all on function public.mask_profanity(text) from public;
grant execute on function public.mask_profanity(text) to authenticated;

-- 3) 초성체 + 패드립 + 성적 표현 기본 사전 추가
insert into public.banned_words (word) values
  -- 초성체 (타이핑 자모로 칠 때만 매칭 → 정상어 오검출 없음)
  ('ㅅㅂ'), ('ㅆㅂ'), ('ㅂㅅ'), ('ㅄ'), ('ㅈㄴ'), ('ㅈㄹ'), ('ㄲㅈ'), ('ㅅㄲ'), ('ㄷㅊ'), ('ㅗ'),
  -- 패드립
  ('느금마'), ('느검마'), ('느그애미'), ('니애미'), ('니에미'), ('애미뒤'), ('애미없'),
  ('엄창'), ('니미럴'), ('패드립'),
  -- 성적 표현
  ('섹스'), ('야스'), ('딸딸이'), ('자위'), ('꼴려'), ('꼴리'), ('발정'), ('몽정'),
  ('페니스'), ('씹창'), ('씹새')
on conflict (word) do nothing;
