-- Reversible archive state for admin inbox items.
alter table public.receipt_submissions
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

insert into public.app_settings(key,value,description,is_public)
values ('retention_days','365'::jsonb,'Antal dagar arkiverade underlag behålls',false)
on conflict (key) do update set description = excluded.description;

create index if not exists receipt_submissions_archived_idx
on public.receipt_submissions(archived_at, created_at desc);
