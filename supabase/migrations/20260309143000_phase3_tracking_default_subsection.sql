-- Phase 3 (M3-S1-3): support section-direct tracking items via hidden system default subsection
alter table public.tracking_subsections
  add column if not exists is_system_default boolean not null default false;

create unique index if not exists uq_tracking_subsections_system_default_per_section
  on public.tracking_subsections(group_id, section_id)
  where is_system_default = true;
