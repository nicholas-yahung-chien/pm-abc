create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.auth_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_account
  on public.password_reset_tokens(account_id);

create index if not exists idx_password_reset_tokens_expires_at
  on public.password_reset_tokens(expires_at);
