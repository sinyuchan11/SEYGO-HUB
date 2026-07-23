-- 욕설 필터 우회 대응 (로드맵 #6 보강)
-- 0012의 리터럴 마스킹을 '한글 자모 정규화' 기반으로 업그레이드한다.
--   - 음절을 자모로 분해하고 초성 ㅇ을 제거 + 연속 중복 자모를 축약 →
--     늘려쓰기("씨이이이발"), 반복("씨발발"), 공백/기호 삽입("시 발", "씨*발") 우회를 잡는다.
--   - 원문↔정규형 위치 매핑으로 원문의 해당 구간만 정확히 '*' 치환한다.
--     (겹치는 금지어는 합집합으로 마스킹 → "좆같은" → "**은")
-- 트리거(tg_mask_profanity)와 contains_profanity는 그대로 재사용된다(내부에서 mask_profanity 호출).

-- 1) 정규화 함수: 텍스트를 자모 정규형 문자열로 변환. 금지어 정규화 + 탐지에 재사용.
create or replace function public.normalize_profanity(input text)
returns text
language plpgsql
immutable
as $$
declare
  cho  constant text[] := array['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  jung constant text[] := array['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  jong constant text[] := array['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  n int; i int; c text; cp int; s int; ci int; ji int; ki int;
  buf text := '';
  res text := '';
  prev text := '';
  ch text;
begin
  if input is null then return null; end if;
  n := char_length(input);
  for i in 1..n loop
    c := substr(input, i, 1);
    cp := ascii(c);
    if cp between 44032 and 55203 then          -- 한글 음절 → 자모 분해
      s := cp - 44032; ci := s / 588; ji := (s % 588) / 28; ki := s % 28;
      if ci <> 11 then buf := buf || cho[ci + 1]; end if;   -- 초성 ㅇ(11) 제거
      buf := buf || jung[ji + 1];
      if ki <> 0 then buf := buf || jong[ki + 1]; end if;
    elsif cp between 12593 and 12643 then        -- 타이핑된 호환 자모(ㅅㅂ 등)는 유지
      buf := buf || c;
    elsif cp between 65 and 90 then               -- A-Z → 소문자
      buf := buf || lower(c);
    elsif cp between 97 and 122 then              -- a-z
      buf := buf || c;
    end if;                                       -- 그 외(공백/숫자/기호)는 무시
  end loop;

  n := char_length(buf);
  for i in 1..n loop                              -- 연속 중복 자모 축약
    ch := substr(buf, i, 1);
    if ch <> prev then res := res || ch; prev := ch; end if;
  end loop;
  return res;
end;
$$;

-- 2) 마스킹 함수: 자모 정규형에서 금지어를 찾아 원문 해당 구간을 '*'로 치환.
create or replace function public.mask_profanity(input text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cho  constant text[] := array['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  jung constant text[] := array['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  jong constant text[] := array['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  n int; i int; c text; cp int; s int; ci int; ji int; ki int;
  jchars text[] := '{}';    -- 분해된 자모(축약 전)
  jidx   int[]  := '{}';    -- 각 자모의 원문 인덱스
  cj text := '';            -- 축약된 자모 문자열
  cstart int[] := '{}';     -- 축약 원소가 덮는 원문 시작 인덱스
  cend   int[] := '{}';     -- 축약 원소가 덮는 원문 끝 인덱스
  clen int := 0; prev text := ''; jc text; oi int; k int;
  masked boolean[];
  w record; nword text; wlen int; pos int; startsearch int; a int; b int; os int; oe int;
  result text := '';
begin
  if input is null then return input; end if;
  n := char_length(input);
  if n = 0 then return input; end if;

  -- (1) 자모 분해 + 원문 인덱스 매핑
  for i in 1..n loop
    c := substr(input, i, 1);
    cp := ascii(c);
    if cp between 44032 and 55203 then
      s := cp - 44032; ci := s / 588; ji := (s % 588) / 28; ki := s % 28;
      if ci <> 11 then jchars := jchars || cho[ci + 1]; jidx := jidx || i; end if;
      jchars := jchars || jung[ji + 1]; jidx := jidx || i;
      if ki <> 0 then jchars := jchars || jong[ki + 1]; jidx := jidx || i; end if;
    elsif cp between 12593 and 12643 then
      jchars := jchars || c; jidx := jidx || i;
    elsif cp between 65 and 90 then
      jchars := jchars || lower(c); jidx := jidx || i;
    elsif cp between 97 and 122 then
      jchars := jchars || c; jidx := jidx || i;
    end if;
  end loop;

  if array_length(jchars, 1) is null then
    return input;   -- 정규화할 문자가 없음
  end if;

  -- (2) 연속 중복 자모 축약 + 원문 인덱스 구간 추적
  for k in 1..array_length(jchars, 1) loop
    jc := jchars[k]; oi := jidx[k];
    if clen > 0 and jc = prev then
      cend[clen] := oi;
    else
      cj := cj || jc; clen := clen + 1;
      cstart[clen] := oi; cend[clen] := oi; prev := jc;
    end if;
  end loop;

  -- (3) 마스킹 플래그
  masked := array_fill(false, array[n]);

  -- (4) 금지어별로 정규형을 cj에서 찾아 원문 구간을 플래그
  for w in select word from public.banned_words loop
    nword := public.normalize_profanity(w.word);
    wlen := char_length(nword);
    if wlen = 0 then continue; end if;
    startsearch := 1;
    loop
      pos := strpos(substr(cj, startsearch), nword);
      exit when pos = 0;
      a := startsearch + pos - 1;
      b := a + wlen - 1;
      os := cstart[a]; oe := cend[b];
      for i in os..oe loop masked[i] := true; end loop;
      startsearch := a + 1;
    end loop;
  end loop;

  -- (5) 플래그된 원문 문자를 '*'로 치환하며 재조립
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

-- 3) 초성 섞임 대응: 안전한 변형만 시드에 추가 (순수 초성체는 정상어 오검출 위험으로 제외)
insert into public.banned_words (word) values
  ('ㅈ같'), ('개ㅅㄲ')
on conflict (word) do nothing;
