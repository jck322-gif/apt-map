-- ===========================================================
-- 청약 계획 달력 — 청약홈 분양정보를 우리 DB에 저장해두는 테이블.
-- Supabase 대시보드 → SQL Editor → New query 에 이 내용을 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다.
--
-- 실거래가와 달리 청약홈 API는 외부 서버(api.odcloud.kr) 응답이 느릴 수 있어서,
-- 방문자가 페이지를 열 때마다 그 API를 직접 부르지 않고 여기 저장해둔 것만 읽습니다.
-- (실제로 채워 넣는 건 /api/subscription-sync 가 주기적으로 합니다.)
-- ===========================================================

create table if not exists subscriptions (
  pblanc_no             text primary key,       -- 공고번호 (청약홈 고유 번호)
  house_name             text    not null,        -- 단지명
  region_name            text    not null,        -- 공급지역(시·도) — "부산광역시" 등
  address                text,                    -- 공급위치
  house_type             text,                    -- 국민/민영 등 구분
  total_households       int,                     -- 총 공급세대수
  notice_date            date,                    -- 모집공고일
  special_supply_start   date,
  special_supply_end     date,
  rank1_start            date,
  rank1_end              date,
  rank2_start            date,
  rank2_end              date,
  winner_announce_date   date,
  homepage_url           text,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_region_idx on subscriptions (region_name);
create index if not exists subscriptions_dates_idx  on subscriptions (notice_date, rank1_start);
