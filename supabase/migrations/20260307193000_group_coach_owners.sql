create table if not exists public.group_coach_owners (
  group_id uuid primary key references public.groups(id) on delete cascade,
  coach_account_id uuid not null references public.auth_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_group_coach_owners_coach_account_id
  on public.group_coach_owners(coach_account_id);

drop trigger if exists trg_group_coach_owners_updated_at on public.group_coach_owners;
create trigger trg_group_coach_owners_updated_at
before update on public.group_coach_owners
for each row execute function public.set_updated_at();
