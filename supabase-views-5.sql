-- ===========================================================
-- 단지 목록 뷰 — 단지별 페이지(/apt/...)와 사이트맵이 씁니다.
-- Supabase 대시보드 → SQL Editor → New query 에 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다.
-- ===========================================================

-- 컬럼 순서를 바꾸면 create or replace 가 거부되므로(42P16) 먼저 지웁니다.
drop view if exists complex_list;

create view complex_list as
select
  d.region_code,
  d.complex,
  -- 같은 단지가 여러 법정동에 걸쳐 신고되는 경우가 있어, 가장 최근 거래의 동을 대표로 씁니다.
  (array_agg(d.dong order by d.deal_date desc))[1] as dong,
  max(d.build_year)                                as build_year,
  count(*) filter (where d.deal_type = 'sale')::int as sale_cnt,
  count(*)::int                                     as total_cnt,
  max(d.deal_date)                                  as last_deal_date
from deals d
group by d.region_code, d.complex;

grant select on complex_list to anon, authenticated, service_role;

-- 지역별 단지 목록을 빠르게 훑기 위한 인덱스
create index if not exists deals_region_complex_idx on deals (region_code, complex);
