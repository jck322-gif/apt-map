-- 부울아파트 회원(아이디·비밀번호 / 구글 / 카카오) + 관심단지 이메일 알림 (2026-10-14)
-- Supabase → SQL Editor 에 이 파일 내용을 그대로 붙여 넣고 Run 한 번만 누르면 됩니다.
-- 모든 표는 서버(SUPABASE_SECRET_KEY)로만 읽고 씁니다. 브라우저에서 직접 읽지 못하게 RLS를 켜 둡니다.

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  -- 아이디(=이메일). 카카오처럼 이메일을 안 주는 로그인이면 비어 있다가, 알림 받을 메일을 따로 등록합니다.
  email text unique,
  email_verified boolean not null default false,
  password_hash text,                 -- 아이디·비밀번호 가입자만 (scrypt 해시, 원문 저장 안 함)
  google_sub text unique,             -- 구글 계정 고유번호
  kakao_id text unique,               -- 카카오 회원번호
  display_name text,
  terms_agreed_at timestamptz,        -- 필수 동의(개인정보 수집·이용, 만 14세 이상) 시각
  marketing_opt_in boolean not null default false,  -- [선택] 광고성 정보 수신 동의
  email_paused boolean not null default false,      -- 알림 메일 멈춤
  unsub_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 메일 인증·비밀번호 재설정 링크 (1회용, 해시만 저장)
create table if not exists auth_tokens (
  token_hash text primary key,
  purpose text not null,              -- 'verify' | 'reset'
  user_id uuid references app_users(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_tokens_email_idx on auth_tokens (email, created_at desc);

-- 로그인 시도 기록 (비밀번호 무작위 대입 막기용)
create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts (email, created_at desc);

-- 로그인 상태 (쿠키에는 세션 ID 원문, DB에는 해시만)
create table if not exists user_sessions (
  id_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists user_sessions_user_idx on user_sessions (user_id);

-- 관심 단지 + 알림 종류
create table if not exists user_watches (
  user_id uuid not null references app_users(id) on delete cascade,
  region_code text not null,
  complex text not null,
  region_name text,
  grp text,
  notify_record boolean not null default true,
  notify_all boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, region_code, complex)
);
create index if not exists user_watches_complex_idx on user_watches (region_code, complex);

-- 하루 한 통만 보내도록 기록
create table if not exists notification_log (
  user_id uuid not null references app_users(id) on delete cascade,
  sent_date date not null,
  item_count int not null default 0,
  sent_at timestamptz not null default now(),
  primary key (user_id, sent_date)
);

alter table app_users enable row level security;
alter table auth_tokens enable row level security;
alter table login_attempts enable row level security;
alter table user_sessions enable row level security;
alter table user_watches enable row level security;
alter table notification_log enable row level security;
