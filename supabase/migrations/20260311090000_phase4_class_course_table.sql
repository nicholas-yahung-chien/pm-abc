-- Phase 4 (P0-1): class-level course table hierarchy (item -> topic -> chapter)
create extension if not exists pgcrypto;

create table if not exists public.class_course_items (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  course_date date,
  instructor_name text not null default '',
  bg_color text not null default '#ffffff',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_class_course_items_sort_order_non_negative check (sort_order >= 0),
  constraint chk_class_course_items_bg_color_valid
    check (bg_color ~* '^#[0-9a-f]{6}$')
);

create table if not exists public.class_course_topics (
  id uuid primary key default gen_random_uuid(),
  class_course_item_id uuid not null references public.class_course_items(id) on delete cascade,
  title text not null,
  bg_color text not null default '#ffffff',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_class_course_topics_sort_order_non_negative check (sort_order >= 0),
  constraint chk_class_course_topics_bg_color_valid
    check (bg_color ~* '^#[0-9a-f]{6}$')
);

create table if not exists public.class_course_chapters (
  id uuid primary key default gen_random_uuid(),
  class_course_topic_id uuid not null references public.class_course_topics(id) on delete cascade,
  title text not null,
  paper_page text not null default '',
  sort_order integer not null default 100,
  created_by_account_id uuid references public.auth_accounts(id) on delete set null,
  updated_by_account_id uuid references public.auth_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_class_course_chapters_sort_order_non_negative check (sort_order >= 0)
);

drop trigger if exists trg_class_course_items_updated_at on public.class_course_items;
create trigger trg_class_course_items_updated_at
before update on public.class_course_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_class_course_topics_updated_at on public.class_course_topics;
create trigger trg_class_course_topics_updated_at
before update on public.class_course_topics
for each row execute function public.set_updated_at();

drop trigger if exists trg_class_course_chapters_updated_at on public.class_course_chapters;
create trigger trg_class_course_chapters_updated_at
before update on public.class_course_chapters
for each row execute function public.set_updated_at();

create index if not exists idx_class_course_items_class_order
  on public.class_course_items(class_id, sort_order, created_at);

create index if not exists idx_class_course_topics_item_order
  on public.class_course_topics(class_course_item_id, sort_order, created_at);

create index if not exists idx_class_course_chapters_topic_order
  on public.class_course_chapters(class_course_topic_id, sort_order, created_at);
