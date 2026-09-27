-- Serialize membership mutations, including concurrent requests from different SUs.
-- No new role model; the authoritative role remains public.admin_users.role.
create or replace function public.change_receipt_staff(
  actor_id uuid, target_id uuid, assigned_role text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare target_role text;
begin
  lock table public.admin_users in share row exclusive mode;
  if not exists (select 1 from public.admin_users where user_id = actor_id and role = 'superuser') then
    raise exception 'SU-behörighet krävs.' using errcode = '42501';
  end if;
  if actor_id = target_id then
    raise exception 'Du kan inte ändra eller ta bort din egen behörighet.' using errcode = '22023';
  end if;
  if assigned_role is not null and assigned_role not in ('superuser','admin','cashier','tester','viewer') then
    raise exception 'Ogiltig behörighet.' using errcode = '22023';
  end if;
  select role into target_role from public.admin_users where user_id = target_id;
  if not found then
    raise exception 'Användaren har ingen behörighet att ändra.' using errcode = '22023';
  end if;
  if target_role = 'superuser' and assigned_role is distinct from 'superuser'
     and (select count(*) from public.admin_users where role = 'superuser') <= 1 then
    raise exception 'Den sista SU-behörigheten måste finnas kvar.' using errcode = '22023';
  end if;
  if assigned_role is null then
    delete from public.admin_users where user_id = target_id;
  else
    update public.admin_users set role = assigned_role where user_id = target_id;
  end if;
end;
$$;
-- Only the authenticated Edge Function may supply actor_id, from verified Auth.
revoke all on function public.change_receipt_staff(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.change_receipt_staff(uuid,uuid,text) to service_role;

-- Preserve the final SU even if a privileged maintenance operation bypasses RPC.
create or replace function public.lock_receipt_staff_changes()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  lock table public.admin_users in share row exclusive mode;
  return null;
end;
$$;
create or replace function public.protect_last_receipt_superuser()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.role = 'superuser' and (tg_op = 'DELETE' or new.role is distinct from 'superuser')
     and (select count(*) from public.admin_users where role = 'superuser') <= 1 then
    raise exception 'Den sista SU-behörigheten måste finnas kvar.' using errcode = '22023';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.lock_receipt_staff_changes() from public, anon, authenticated;
revoke all on function public.protect_last_receipt_superuser() from public, anon, authenticated;
create trigger receipt_staff_write_lock before update or delete on public.admin_users
  for each statement execute function public.lock_receipt_staff_changes();
create trigger receipt_staff_last_su before update or delete on public.admin_users
  for each row execute function public.protect_last_receipt_superuser();

-- These existing handler events must not fail after a successful role mutation.
-- Requires 20260923202626_expand_receipt_security_audit.sql first.
alter table public.receipt_admin_audit drop constraint receipt_admin_audit_detail_code_check;
alter table public.receipt_admin_audit add constraint receipt_admin_audit_detail_code_check
  check (detail_code is null or detail_code in (
    'invalid_credentials','rate_limited','manual_logout','idle_timeout','session_expired',
    'invitation_sent','role_assigned','role_changed','role_removed','receipt_received'
  ));
