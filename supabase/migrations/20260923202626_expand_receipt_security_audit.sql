-- Human-readable, bounded audit context for the SU security view.
-- The service-role-only table remains inaccessible to browser clients.
alter table public.receipt_admin_audit
  drop constraint if exists receipt_admin_audit_event_type_check;

alter table public.receipt_admin_audit
  add constraint receipt_admin_audit_event_type_check check (
    event_type in (
      'login','access','test-mail','settings','submission','archive','invite',
      'logout','audit','receipt-submitted','permission-change'
    )
  ),
  add column actor_email text check (actor_email is null or length(actor_email) <= 320),
  add column actor_name text check (actor_name is null or length(actor_name) <= 200),
  add column actor_role text check (actor_role is null or actor_role in ('superuser','admin','cashier','tester','viewer')),
  add column subject_email text check (subject_email is null or length(subject_email) <= 320),
  add column subject_name text check (subject_name is null or length(subject_name) <= 200),
  add column target_email text check (target_email is null or length(target_email) <= 320),
  add column target_role text check (target_role is null or target_role in ('superuser','admin','cashier','tester','viewer')),
  add column detail_code text check (detail_code is null or detail_code in (
    'invalid_credentials','rate_limited','manual_logout','idle_timeout','session_expired',
    'invitation_sent','role_assigned','receipt_received'
  )),
  add column severity text not null default 'low' check (severity in ('low','medium','high','critical'));

create index receipt_admin_audit_login_pattern_idx
  on public.receipt_admin_audit(actor_email, created_at desc)
  where event_type = 'login' and success = false;
