-- Phase 4 (M4-S3-2): support coach-led reading assignment mode

alter table if exists public.group_study_reading_assignments
  add column if not exists is_coach_led boolean not null default false;

alter table if exists public.group_study_reading_assignments
  alter column person_id drop not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'chk_group_study_reading_assignments_assignee_mode'
  ) then
    alter table public.group_study_reading_assignments
      drop constraint chk_group_study_reading_assignments_assignee_mode;
  end if;
end $$;

alter table if exists public.group_study_reading_assignments
  add constraint chk_group_study_reading_assignments_assignee_mode
  check (
    (is_coach_led = true and person_id is null)
    or
    (is_coach_led = false and person_id is not null)
  );
