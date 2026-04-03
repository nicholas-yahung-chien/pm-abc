-- Phase 5 (P2): store Zoom meeting ID on study sessions for future updates/deletes
alter table public.group_study_sessions
  add column if not exists zoom_meeting_id text;
