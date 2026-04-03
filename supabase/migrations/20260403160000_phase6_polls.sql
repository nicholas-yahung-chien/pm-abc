-- Phase 6 (P3): group polls and voting

create type public.poll_type as enum ('topic', 'time');

create table if not exists public.group_polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text not null default '',
  poll_type public.poll_type not null default 'topic',
  expires_at timestamptz not null,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.group_polls(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  label text not null,
  -- for time polls: the specific date+time slot this option represents
  slot_datetime timestamptz,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint chk_group_poll_options_sort_order_non_negative check (sort_order >= 0)
);

create table if not exists public.group_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.group_polls(id) on delete cascade,
  option_id uuid not null references public.group_poll_options(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- topic polls: one vote per person per poll
  -- time polls: one vote per person per option (multiple allowed)
  constraint uq_group_poll_votes_person_option unique (option_id, person_id)
);

drop trigger if exists trg_group_polls_updated_at on public.group_polls;
create trigger trg_group_polls_updated_at
before update on public.group_polls
for each row execute function public.set_updated_at();

create index if not exists idx_group_polls_group_expires
  on public.group_polls(group_id, expires_at desc);

create index if not exists idx_group_poll_options_poll_order
  on public.group_poll_options(poll_id, sort_order, created_at);

create index if not exists idx_group_poll_votes_poll_person
  on public.group_poll_votes(poll_id, person_id);

create index if not exists idx_group_poll_votes_option
  on public.group_poll_votes(option_id);
