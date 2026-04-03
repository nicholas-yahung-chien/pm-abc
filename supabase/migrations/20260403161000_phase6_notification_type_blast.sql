-- Phase 6 (P3): add group_email_blast to notification_type enum
alter type public.notification_type add value if not exists 'group_email_blast';
