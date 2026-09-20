-- Test submissions remain clearly distinguishable from payable submissions.
alter table public.receipt_submissions add column if not exists is_test boolean not null default false;
alter table public.receipt_submissions enable row level security;
-- Keep existing receipt access policies. Email writes go through the validated admin API.
-- Enforce values even for direct SQL/Data API writes without affecting unrelated settings.
alter table public.app_settings add constraint receipt_email_mode_valid
  check (key <> 'email_delivery_mode' or (jsonb_typeof(value) = 'string' and value #>> '{}' in ('production','test','disabled')));
