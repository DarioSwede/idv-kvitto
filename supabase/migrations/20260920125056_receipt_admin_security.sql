-- Local migration only. App events are distinct from Supabase Auth audit events.
create table public.receipt_admin_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  event_type text not null check (event_type in ('login','access','test-mail','settings','submission','archive','invite','logout','audit')),
  success boolean, -- null = attempted; correlated final event confirms the outcome
  request_id uuid not null,
  target_id uuid,
  method text not null check (method in ('GET','POST','PATCH','DELETE')),
  path text not null check (length(path) <= 100),
  user_agent text not null default '' check (length(user_agent) <= 300),
  ip_address inet,
  country text check (country ~ '^[A-Z]{2}$'),
  auth_method text not null default 'supabase_auth'
);
alter table public.receipt_admin_audit enable row level security;
revoke all on public.receipt_admin_audit from public, anon, authenticated;
grant select, insert, delete on public.receipt_admin_audit to service_role;
create index receipt_admin_audit_created_idx on public.receipt_admin_audit(created_at desc);
-- No client write/read policies: every request must pass the current admin role check in admin-api.
-- User IDs intentionally survive account deletion for the bounded retention period.

-- Enforce expiry independently of traffic. Supabase supports pg_cron; if absent,
-- provisioning must enable it before applying this migration (do not silently skip retention).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('receipt-admin-audit-retention','23 2 * * *',
  $$delete from public.receipt_admin_audit where created_at < now() - interval '90 days'$$);

-- Keep membership writes server-only; the current role is read with a service client.
alter table public.admin_users enable row level security;
revoke insert, update, delete on public.admin_users from anon, authenticated;

-- Reconcile the historical two-role migration with the four-role API contract.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role in ('admin','cashier','tester','viewer'));
