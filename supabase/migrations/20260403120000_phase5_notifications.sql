-- Phase 5 (P1): notification system — templates, logs
-- All outbound email types are represented as notification_type enum values.

create type public.notification_type as enum (
  'tracking_due_reminder',
  'study_session_reminder_1day',
  'study_session_reminder_2hour'
);

create type public.notification_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- Notification logs: one row per attempted delivery
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  notification_type public.notification_type not null,
  -- Original intended recipient (always a person record)
  recipient_person_id uuid references public.people(id) on delete set null,
  recipient_email text not null,
  -- Actual delivery address (may differ from recipient_email during dev redirect)
  delivered_to_email text not null,
  -- Whether the dev redirect was active for this send
  dev_redirected boolean not null default false,
  subject text not null default '',
  -- Reference IDs (nullable — depends on notification type)
  tracking_item_id uuid references public.tracking_items(id) on delete set null,
  study_session_id uuid references public.group_study_sessions(id) on delete set null,
  -- Idempotency: prevent duplicate sends within the same trigger window
  idempotency_key text not null unique,
  status public.notification_status not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_logs_type_status
  on public.notification_logs(notification_type, status);

create index if not exists idx_notification_logs_created_at
  on public.notification_logs(created_at desc);

create index if not exists idx_notification_logs_recipient_person
  on public.notification_logs(recipient_person_id);

create index if not exists idx_notification_logs_idempotency_key
  on public.notification_logs(idempotency_key);
