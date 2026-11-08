-- 희망가 알림 (2026-11-07)
-- 관심 단지마다 "이 평형이 이 가격 이하로 거래되면 알려줘"를 저장합니다.
-- Supabase → SQL Editor 에 이 파일 내용을 그대로 붙여 넣고 Run 한 번만 누르면 됩니다.

alter table user_watches add column if not exists target_price_manwon integer;  -- 희망가(만원). 비어 있으면 희망가 알림 없음
alter table user_watches add column if not exists target_area_m2 integer;       -- 전용면적(㎡, 반올림). 비어 있으면 모든 평형

-- (추가) 이 가격 이상으로 거래되면 알림 — 이미 위 두 줄을 실행했다면 아래 한 줄만 실행하면 됩니다.
alter table user_watches add column if not exists target_above_manwon integer;  -- 이 가격(만원) 이상 매매 알림
