-- Phase 2 core entities: classes, groups, people, roles, assignments, directory
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'person_type') then
    create type person_type as enum ('coach', 'member');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_type') then
    create type membership_type as enum ('coach', 'member');
  end if;
end $$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  code text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(class_id, code)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  person_no text,
  full_name text not null,
  display_name text not null default '',
  person_type person_type not null default 'member',
  email text not null default '',
  phone text not null default '',
  line_id text not null default '',
  intro text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  membership_type membership_type not null default 'member',
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  unique(group_id, person_id)
);

create table if not exists public.role_definitions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique(group_id, name)
);

create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  role_id uuid not null references public.role_definitions(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique(group_id, role_id, person_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists trg_groups_updated_at on public.groups;
create trigger trg_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create index if not exists idx_groups_class_id on public.groups(class_id);
create index if not exists idx_group_memberships_group_id on public.group_memberships(group_id);
create index if not exists idx_group_memberships_person_id on public.group_memberships(person_id);
create index if not exists idx_role_definitions_group_id on public.role_definitions(group_id);
create index if not exists idx_role_assignments_group_id on public.role_assignments(group_id);
create index if not exists idx_role_assignments_role_id on public.role_assignments(role_id);
create index if not exists idx_role_assignments_person_id on public.role_assignments(person_id);

