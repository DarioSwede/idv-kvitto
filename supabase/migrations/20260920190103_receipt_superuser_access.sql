-- Local only. Provision the first SU explicitly by verified user_id before publishing.
-- Existing admins deliberately remain admins: this migration grants nobody SU.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role in ('superuser','admin','cashier','tester','viewer'));

create or replace function public.is_receipt_superuser()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid() and role = 'superuser');
$$;
revoke all on function public.is_receipt_superuser() from public;
grant execute on function public.is_receipt_superuser() to anon, authenticated;

-- Settings writes always go through admin-api. This also closes legacy owner/admin
-- policies that otherwise bypass its per-key authorization and value validation.
revoke insert, update, delete on public.app_settings from public, anon, authenticated;
grant select, insert, update, delete on public.app_settings to service_role;

-- Restrictive policy bounds every existing permissive SELECT policy, including
-- public_select_app_settings. Public form constraints remain readable; private
-- administration settings require the current database SU role.
create policy receipt_settings_read_boundary on public.app_settings
  as restrictive for select to anon, authenticated using (
    public.is_receipt_superuser() or key in (
      'travel_rate_per_km','max_travel_km','max_receipts','max_file_size_mb',
      'max_total_upload_mb','allowed_mime_types','ocr_enabled','ocr_retry_enabled','cc_self_enabled'
    )
  );
