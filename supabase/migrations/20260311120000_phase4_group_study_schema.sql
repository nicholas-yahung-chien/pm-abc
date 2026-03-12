-- Phase 4 (P0-2): group-level study sessions and reading assignments
create extension if not exists pgcrypto;

create table if not exists public.group_study_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  session_date date,
  start_time time,
  end_time time,
  mode text not null default 'offline',
  location_address text not null default '',
  map_url text not null default '',
  online_meeting_url text not null default '',
  note text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_group_study_sessions_mode_valid
    check (mode in ('offline', 'online')),
  constraint chk_group_study_sessions_sort_order_non_negative
    check (sort_order >= 0),
  constraint chk_group_study_sessions_time_range_valid
    check (start_time is null or end_time is null or start_time <= end_time),
  constraint uq_group_study_sessions_id_group unique (id, group_id)
);

create table if not exists public.group_study_session_duty_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  session_id uuid not null references public.group_study_sessions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  note text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_group_study_session_duty_members_sort_order_non_negative
    check (sort_order >= 0),
  constraint uq_group_study_session_duty_members_session_person
    unique (session_id, person_id),
  constraint fk_group_study_session_duty_members_session_group
    foreign key (session_id, group_id)
    references public.group_study_sessions(id, group_id)
    on delete cascade
);

create table if not exists public.group_study_reading_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  session_id uuid not null references public.group_study_sessions(id) on delete cascade,
  class_course_chapter_id uuid references public.class_course_chapters(id) on delete set null,
  title text not null default '',
  paper_page text not null default '',
  note text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_group_study_reading_items_sort_order_non_negative
    check (sort_order >= 0),
  constraint uq_group_study_reading_items_id_group unique (id, group_id),
  constraint fk_group_study_reading_items_session_group
    foreign key (session_id, group_id)
    references public.group_study_sessions(id, group_id)
    on delete cascade
);

create table if not exists public.group_study_reading_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  reading_item_id uuid not null references public.group_study_reading_items(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  note text not null default '',
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_group_study_reading_assignments_item unique (reading_item_id),
  constraint fk_group_study_reading_assignments_item_group
    foreign key (reading_item_id, group_id)
    references public.group_study_reading_items(id, group_id)
    on delete cascade
);

drop trigger if exists trg_group_study_sessions_updated_at on public.group_study_sessions;
create trigger trg_group_study_sessions_updated_at
before update on public.group_study_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_group_study_session_duty_members_updated_at on public.group_study_session_duty_members;
create trigger trg_group_study_session_duty_members_updated_at
before update on public.group_study_session_duty_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_group_study_reading_items_updated_at on public.group_study_reading_items;
create trigger trg_group_study_reading_items_updated_at
before update on public.group_study_reading_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_group_study_reading_assignments_updated_at on public.group_study_reading_assignments;
create trigger trg_group_study_reading_assignments_updated_at
before update on public.group_study_reading_assignments
for each row execute function public.set_updated_at();

create index if not exists idx_group_study_sessions_group_order
  on public.group_study_sessions(group_id, sort_order, created_at);

create index if not exists idx_group_study_session_duty_members_group_session_order
  on public.group_study_session_duty_members(group_id, session_id, sort_order, created_at);

create index if not exists idx_group_study_session_duty_members_person
  on public.group_study_session_duty_members(group_id, person_id);

create index if not exists idx_group_study_reading_items_group_session_order
  on public.group_study_reading_items(group_id, session_id, sort_order, created_at);

create index if not exists idx_group_study_reading_items_chapter
  on public.group_study_reading_items(class_course_chapter_id);

create index if not exists idx_group_study_reading_assignments_group_item
  on public.group_study_reading_assignments(group_id, reading_item_id);

create index if not exists idx_group_study_reading_assignments_group_person
  on public.group_study_reading_assignments(group_id, person_id);
