-- Phase 3 (M3-S2-1): support multi-type tracking item responses (checkbox/number/date/select)

create or replace function public.validate_tracking_item_response_options(
  input_response_type text,
  input_response_options jsonb
)
returns boolean
language plpgsql
as $$
declare
  option_value text;
  normalized_option text;
  option_count integer := 0;
begin
  if input_response_options is null then
    return false;
  end if;

  if jsonb_typeof(input_response_options) <> 'array' then
    return false;
  end if;

  if input_response_type not in ('checkbox', 'number', 'date', 'select') then
    return false;
  end if;

  for option_value in
    select value
    from jsonb_array_elements_text(input_response_options) as t(value)
  loop
    option_count := option_count + 1;
    normalized_option := btrim(option_value);
    if normalized_option = '' then
      return false;
    end if;
  end loop;

  if input_response_type = 'select' then
    return option_count > 0;
  end if;

  return option_count = 0;
end;
$$;

alter table public.tracking_items
  add column if not exists response_type text not null default 'checkbox',
  add column if not exists response_options jsonb not null default '[]'::jsonb;

update public.tracking_items
set
  response_type = coalesce(nullif(response_type, ''), 'checkbox'),
  response_options = coalesce(response_options, '[]'::jsonb);

alter table public.tracking_items
  drop constraint if exists chk_tracking_items_response_type_valid;

alter table public.tracking_items
  add constraint chk_tracking_items_response_type_valid
  check (response_type in ('checkbox', 'number', 'date', 'select'));

alter table public.tracking_items
  drop constraint if exists chk_tracking_items_response_options_valid;

alter table public.tracking_items
  add constraint chk_tracking_items_response_options_valid
  check (public.validate_tracking_item_response_options(response_type, response_options));

create index if not exists idx_tracking_items_response_type
  on public.tracking_items(group_id, response_type);

alter table public.tracking_item_member_completions
  add column if not exists number_value numeric(8,2),
  add column if not exists date_value date,
  add column if not exists select_value text;

create or replace function public.sync_tracking_item_member_completion()
returns trigger
language plpgsql
as $$
declare
  item_response_type text;
  item_response_options jsonb;
  normalized_select_value text;
begin
  select
    ti.response_type,
    ti.response_options
  into
    item_response_type,
    item_response_options
  from public.tracking_items ti
  where ti.id = new.item_id;

  if item_response_type is null then
    raise exception 'tracking item not found: %', new.item_id;
  end if;

  if item_response_type = 'checkbox' then
    new.number_value := null;
    new.date_value := null;
    new.select_value := null;

    if coalesce(new.is_completed, false) then
      new.is_completed := true;
      if new.completed_at is null then
        new.completed_at := now();
      end if;
    else
      new.is_completed := false;
      new.completed_at := null;
      new.completed_by_account_id := null;
    end if;

    return new;
  end if;

  if item_response_type = 'number' then
    new.date_value := null;
    new.select_value := null;

    if new.number_value is null then
      new.is_completed := false;
      new.completed_at := null;
      new.completed_by_account_id := null;
    else
      new.is_completed := true;
      if new.completed_at is null then
        new.completed_at := now();
      end if;
    end if;

    return new;
  end if;

  if item_response_type = 'date' then
    new.number_value := null;
    new.select_value := null;

    if new.date_value is null then
      new.is_completed := false;
      new.completed_at := null;
      new.completed_by_account_id := null;
    else
      new.is_completed := true;
      if new.completed_at is null then
        new.completed_at := now();
      end if;
    end if;

    return new;
  end if;

  new.number_value := null;
  new.date_value := null;

  normalized_select_value := nullif(btrim(coalesce(new.select_value, '')), '');

  if normalized_select_value is null then
    new.select_value := null;
    new.is_completed := false;
    new.completed_at := null;
    new.completed_by_account_id := null;
    return new;
  end if;

  if jsonb_typeof(item_response_options) <> 'array' then
    raise exception 'tracking item response options is invalid';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(item_response_options) as option_row(value)
    where btrim(option_row.value) = normalized_select_value
  ) then
    raise exception 'tracking item select value is invalid for this item';
  end if;

  new.select_value := normalized_select_value;
  new.is_completed := true;

  if new.completed_at is null then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

