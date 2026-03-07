-- Phase 3 (M3-S1-1): tracking board schema for section/subsection/item hierarchy
create extension if not exists pgcrypto;

create table if not exists public.tracking_sections (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tracking_sections_sort_order_non_negative check (sort_order >= 0)
);

create table if not exists public.tracking_subsections (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  section_id uuid not null references public.tracking_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tracking_subsections_sort_order_non_negative check (sort_order >= 0)
);

create table if not exists public.tracking_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  section_id uuid not null references public.tracking_sections(id) on delete cascade,
  subsection_id uuid not null references public.tracking_subsections(id) on delete cascade,
  title text not null,
  content text not null default '',
  extra_data text not null default '',
  external_url text not null default '',
  due_date date,
  owner_person_id uuid references public.people(id) on delete set null,
  progress_percent integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by_person_id uuid references public.people(id) on delete set null,
  sort_order integer not null default 100,
  copied_from_item_id uuid references public.tracking_items(id) on delete set null,
  moved_from_section_id uuid references public.tracking_sections(id) on delete set null,
  moved_from_subsection_id uuid references public.tracking_subsections(id) on delete set null,
  moved_at timestamptz,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tracking_items_sort_order_non_negative check (sort_order >= 0),
  constraint chk_tracking_items_progress_range check (progress_percent between 0 and 100),
  constraint chk_tracking_items_external_url_format check (
    external_url = '' or external_url ~* '^https?://'
  )
);

create or replace function public.validate_tracking_subsection_scope()
returns trigger
language plpgsql
as $$
declare
  section_group_id uuid;
begin
  select group_id
    into section_group_id
  from public.tracking_sections
  where id = new.section_id;

  if section_group_id is null then
    raise exception 'tracking section not found: %', new.section_id;
  end if;

  if section_group_id <> new.group_id then
    raise exception 'tracking subsection scope mismatch';
  end if;

  return new;
end;
$$;

create or replace function public.validate_tracking_item_scope()
returns trigger
language plpgsql
as $$
declare
  section_group_id uuid;
  subsection_group_id uuid;
  subsection_section_id uuid;
begin
  select group_id
    into section_group_id
  from public.tracking_sections
  where id = new.section_id;

  if section_group_id is null then
    raise exception 'tracking section not found: %', new.section_id;
  end if;

  if section_group_id <> new.group_id then
    raise exception 'tracking item section/group mismatch';
  end if;

  select group_id, section_id
    into subsection_group_id, subsection_section_id
  from public.tracking_subsections
  where id = new.subsection_id;

  if subsection_group_id is null then
    raise exception 'tracking subsection not found: %', new.subsection_id;
  end if;

  if subsection_group_id <> new.group_id then
    raise exception 'tracking item subsection/group mismatch';
  end if;

  if subsection_section_id <> new.section_id then
    raise exception 'tracking item subsection/section mismatch';
  end if;

  if new.owner_person_id is not null and not exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = new.group_id
      and gm.person_id = new.owner_person_id
      and gm.membership_type = 'member'
  ) then
    raise exception 'tracking item owner is not a member of this group';
  end if;

  if new.completed_by_person_id is not null and not exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = new.group_id
      and gm.person_id = new.completed_by_person_id
      and gm.membership_type = 'member'
  ) then
    raise exception 'tracking item completed_by is not a member of this group';
  end if;

  return new;
end;
$$;

create or replace function public.sync_tracking_item_completion()
returns trigger
language plpgsql
as $$
begin
  if new.is_completed then
    new.progress_percent := 100;
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  elsif new.progress_percent = 100 then
    new.is_completed := true;
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
    new.completed_by_person_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tracking_sections_updated_at on public.tracking_sections;
create trigger trg_tracking_sections_updated_at
before update on public.tracking_sections
for each row execute function public.set_updated_at();

drop trigger if exists trg_tracking_subsections_updated_at on public.tracking_subsections;
create trigger trg_tracking_subsections_updated_at
before update on public.tracking_subsections
for each row execute function public.set_updated_at();

drop trigger if exists trg_tracking_items_updated_at on public.tracking_items;
create trigger trg_tracking_items_updated_at
before update on public.tracking_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_tracking_subsections_validate_scope on public.tracking_subsections;
create trigger trg_tracking_subsections_validate_scope
before insert or update on public.tracking_subsections
for each row execute function public.validate_tracking_subsection_scope();

drop trigger if exists trg_tracking_items_validate_scope on public.tracking_items;
create trigger trg_tracking_items_validate_scope
before insert or update on public.tracking_items
for each row execute function public.validate_tracking_item_scope();

drop trigger if exists trg_tracking_items_sync_completion on public.tracking_items;
create trigger trg_tracking_items_sync_completion
before insert or update on public.tracking_items
for each row execute function public.sync_tracking_item_completion();

create index if not exists idx_tracking_sections_group_order
  on public.tracking_sections(group_id, sort_order, created_at);

create index if not exists idx_tracking_subsections_group_section_order
  on public.tracking_subsections(group_id, section_id, sort_order, created_at);

create index if not exists idx_tracking_items_group_section_subsection_order
  on public.tracking_items(group_id, section_id, subsection_id, sort_order, created_at);

create index if not exists idx_tracking_items_due_date
  on public.tracking_items(group_id, due_date);

create index if not exists idx_tracking_items_is_completed
  on public.tracking_items(group_id, is_completed);

create index if not exists idx_tracking_items_owner_person
  on public.tracking_items(owner_person_id);

create or replace view public.v_group_tracking_progress as
select
  g.id as group_id,
  count(ti.id) as total_items,
  count(*) filter (where ti.is_completed) as completed_items,
  case
    when count(ti.id) = 0 then 0::numeric(5,2)
    else round((count(*) filter (where ti.is_completed)::numeric / count(ti.id)::numeric) * 100, 2)
  end as completion_percent
from public.groups g
left join public.tracking_items ti on ti.group_id = g.id
group by g.id;

create or replace view public.v_tracking_section_progress as
select
  ts.id as section_id,
  ts.group_id,
  count(ti.id) as total_items,
  count(*) filter (where ti.is_completed) as completed_items,
  case
    when count(ti.id) = 0 then 0::numeric(5,2)
    else round((count(*) filter (where ti.is_completed)::numeric / count(ti.id)::numeric) * 100, 2)
  end as completion_percent
from public.tracking_sections ts
left join public.tracking_items ti on ti.section_id = ts.id
group by ts.id, ts.group_id;
