create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'coach', 'member');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'coach_account_status') then
    create type coach_account_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.auth_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null default '',
  role app_role not null,
  password_hash text,
  coach_status coach_account_status not null default 'approved',
  is_active boolean not null default true,
  reviewed_by uuid references public.auth_accounts(id) on delete set null,
  reviewed_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_login_otps (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.auth_accounts(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  notification_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_accounts_role on public.auth_accounts(role);
create index if not exists idx_auth_accounts_coach_status on public.auth_accounts(coach_status);
create index if not exists idx_member_login_otps_email on public.member_login_otps(email);
create index if not exists idx_member_login_otps_account on public.member_login_otps(account_id);
create index if not exists idx_member_login_otps_expires_at on public.member_login_otps(expires_at);

drop trigger if exists trg_auth_accounts_updated_at on public.auth_accounts;
create trigger trg_auth_accounts_updated_at
before update on public.auth_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_settings_updated_at on public.admin_settings;
create trigger trg_admin_settings_updated_at
before update on public.admin_settings
for each row execute function public.set_updated_at();
