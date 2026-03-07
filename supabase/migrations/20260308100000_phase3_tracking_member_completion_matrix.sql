-- Phase 3 (M3-S1-2): tracking matrix by member completion
create extension if not exists pgcrypto;

create table if not exists public.tracking_item_member_completions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  item_id uuid not null references public.tracking_items(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  is_completed boolean not null default true,
  completed_at timestamptz,
  completed_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_tracking_item_member_completions unique (item_id, person_id)
);

create or replace function public.validate_tracking_item_member_completion_scope()
returns trigger
language plpgsql
as $$
declare
  item_group_id uuid;
begin
  select group_id
    into item_group_id
  from public.tracking_items
  where id = new.item_id;

  if item_group_id is null then
    raise exception 'tracking item not found: %', new.item_id;
  end if;

  if item_group_id <> new.group_id then
    raise exception 'tracking item completion group mismatch';
  end if;

  if not exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = new.group_id
      and gm.person_id = new.person_id
      and gm.membership_type = 'member'
  ) then
    raise exception 'tracking item completion person is not a member of this group';
  end if;

  return new;
end;
$$;

create or replace function public.sync_tracking_item_member_completion()
returns trigger
language plpgsql
as $$
begin
  if new.is_completed then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tracking_item_member_completions_updated_at on public.tracking_item_member_completions;
create trigger trg_tracking_item_member_completions_updated_at
before update on public.tracking_item_member_completions
for each row execute function public.set_updated_at();

drop trigger if exists trg_tracking_item_member_completions_validate_scope on public.tracking_item_member_completions;
create trigger trg_tracking_item_member_completions_validate_scope
before insert or update on public.tracking_item_member_completions
for each row execute function public.validate_tracking_item_member_completion_scope();

drop trigger if exists trg_tracking_item_member_completions_sync_completion on public.tracking_item_member_completions;
create trigger trg_tracking_item_member_completions_sync_completion
before insert or update on public.tracking_item_member_completions
for each row execute function public.sync_tracking_item_member_completion();

create index if not exists idx_tracking_item_member_completions_group_item
  on public.tracking_item_member_completions(group_id, item_id);

create index if not exists idx_tracking_item_member_completions_group_person
  on public.tracking_item_member_completions(group_id, person_id);

insert into public.tracking_item_member_completions (
  group_id,
  item_id,
  person_id,
  is_completed,
  completed_at
)
select
  ti.group_id,
  ti.id,
  ti.completed_by_person_id,
  true,
  ti.completed_at
from public.tracking_items ti
where ti.is_completed = true
  and ti.completed_by_person_id is not null
on conflict (item_id, person_id)
do update
set
  is_completed = excluded.is_completed,
  completed_at = excluded.completed_at;

create or replace view public.v_group_tracking_progress as
select
  g.id as group_id,
  (coalesce(items.item_count, 0) * coalesce(members.member_count, 0))::bigint as total_items,
  coalesce(completed.completed_count, 0)::bigint as completed_items,
  case
    when coalesce(items.item_count, 0) = 0 or coalesce(members.member_count, 0) = 0 then 0::numeric(5,2)
    else round(
      (
        coalesce(completed.completed_count, 0)::numeric
        / (coalesce(items.item_count, 0)::numeric * coalesce(members.member_count, 0)::numeric)
      ) * 100,
      2
    )
  end as completion_percent
from public.groups g
left join lateral (
  select count(*) as item_count
  from public.tracking_items ti
  where ti.group_id = g.id
) items on true
left join lateral (
  select count(*) as member_count
  from public.group_memberships gm
  where gm.group_id = g.id
    and gm.membership_type = 'member'
) members on true
left join lateral (
  select count(*) as completed_count
  from public.tracking_item_member_completions timc
  where timc.group_id = g.id
    and timc.is_completed = true
) completed on true;

create or replace view public.v_tracking_section_progress as
select
  ts.id as section_id,
  ts.group_id,
  (coalesce(items.item_count, 0) * coalesce(members.member_count, 0))::bigint as total_items,
  coalesce(completed.completed_count, 0)::bigint as completed_items,
  case
    when coalesce(items.item_count, 0) = 0 or coalesce(members.member_count, 0) = 0 then 0::numeric(5,2)
    else round(
      (
        coalesce(completed.completed_count, 0)::numeric
        / (coalesce(items.item_count, 0)::numeric * coalesce(members.member_count, 0)::numeric)
      ) * 100,
      2
    )
  end as completion_percent
from public.tracking_sections ts
left join lateral (
  select count(*) as item_count
  from public.tracking_items ti
  where ti.section_id = ts.id
) items on true
left join lateral (
  select count(*) as member_count
  from public.group_memberships gm
  where gm.group_id = ts.group_id
    and gm.membership_type = 'member'
) members on true
left join lateral (
  select count(*) as completed_count
  from public.tracking_item_member_completions timc
  join public.tracking_items ti on ti.id = timc.item_id
  where timc.group_id = ts.group_id
    and ti.section_id = ts.id
    and timc.is_completed = true
) completed on true;
