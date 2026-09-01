-- IDV Kvitto: modulär admin/backend-grund

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_receipt_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_receipt_admin() from public;
grant execute on function public.is_receipt_admin() to authenticated;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null default '',
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

create policy "admins can read settings"
on public.app_settings for select
to authenticated
using (public.is_receipt_admin());

create policy "admins can update settings"
on public.app_settings for update
to authenticated
using (public.is_receipt_admin())
with check (public.is_receipt_admin());

insert into public.app_settings(key,value,description,is_public) values
  ('travel_rate_per_km','2.5'::jsonb,'Reseersättning i kronor per kilometer',true),
  ('max_travel_km','10000'::jsonb,'Högsta tillåtna antal kilometer per inskick',true),
  ('max_receipts','10'::jsonb,'Högsta antal kvitton per inskick',true),
  ('max_file_size_mb','10'::jsonb,'Högsta filstorlek per fil i MB',true),
  ('max_total_upload_mb','25'::jsonb,'Högsta sammanlagda filstorlek i MB',true),
  ('allowed_mime_types','["image/jpeg","image/png","image/webp","image/avif","image/heic","image/heif","application/pdf"]'::jsonb,'Tillåtna filtyper',true),
  ('ocr_enabled','true'::jsonb,'Aktivera OCR-förslag',true),
  ('ocr_retry_enabled','true'::jsonb,'Tillåt automatisk OCR-omkörning',true),
  ('cc_self_enabled','true'::jsonb,'Tillåt kopia till avsändaren',true),
  ('receipt_email_to','"betala@idrottsveteranerna.se"'::jsonb,'Visad mottagaradress; faktisk e-postkonfiguration ligger som serverhemlighet',true),
  ('retention_days','365'::jsonb,'Planerad lagringstid för inskick',false)
on conflict (key) do nothing;

alter table public.receipt_submissions
  add column if not exists status text not null default 'new' check (status in ('new','in_progress','done')),
  add column if not exists status_updated_at timestamptz not null default now(),
  add column if not exists handled_by uuid references auth.users(id),
  add column if not exists admin_note text,
  add column if not exists receipt_total numeric(14,2),
  add column if not exists travel_km numeric(10,2),
  add column if not exists travel_description text,
  add column if not exists travel_amount numeric(14,2);

alter table public.receipt_submissions enable row level security;
alter table public.receipt_files enable row level security;

-- Admin läser och uppdaterar rapporter via autentiserad session.
create policy "admins can read receipt submissions"
on public.receipt_submissions for select
to authenticated
using (public.is_receipt_admin());

create policy "admins can update receipt submissions"
on public.receipt_submissions for update
to authenticated
using (public.is_receipt_admin())
with check (public.is_receipt_admin());

create policy "admins can read receipt files"
on public.receipt_files for select
to authenticated
using (public.is_receipt_admin());

create index if not exists receipt_submissions_status_created_idx
on public.receipt_submissions(status, created_at desc);

create index if not exists receipt_submissions_created_idx
on public.receipt_submissions(created_at desc);
