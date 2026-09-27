-- Run in a disposable database with the admin_users schema and SU migration.
-- All fixture changes are rolled back.
begin;
-- admin_users.user_id references auth.users(id); the FK needs real rows here first.
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,
  email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data
) values
 ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000001','authenticated','authenticated','su1@example.org','x',now(),now(),now(),'{}','{}'),
 ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000002','authenticated','authenticated','su2@example.org','x',now(),now(),now(),'{}','{}'),
 ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000003','authenticated','authenticated','viewer@example.org','x',now(),now(),now(),'{}','{}');
-- request_id/method/path are not-null with no default on receipt_admin_audit.
insert into public.receipt_admin_audit(event_type,success,detail_code,request_id,method,path) values
 ('permission-change',true,'role_changed',gen_random_uuid(),'PATCH','/admin-api/staff'),
 ('permission-change',true,'role_removed',gen_random_uuid(),'DELETE','/admin-api/staff');
insert into public.admin_users(user_id,role) values
 ('00000000-0000-0000-0000-000000000001','superuser'),
 ('00000000-0000-0000-0000-000000000002','superuser'),
 ('00000000-0000-0000-0000-000000000003','viewer');
do $$
declare
 a uuid := '00000000-0000-0000-0000-000000000001';
 b uuid := '00000000-0000-0000-0000-000000000002';
 c uuid := '00000000-0000-0000-0000-000000000003';
 r text;
begin
 foreach r in array array['viewer','cashier','tester','admin'] loop
   update public.admin_users set role=r where user_id=c;
   begin
     perform public.change_receipt_staff(c,b,'viewer');
     raise exception 'Non-SU unexpectedly allowed';
   exception when insufficient_privilege then null; end;
 end loop;
 begin
   perform public.change_receipt_staff(a,a,'viewer');
   raise exception 'Self demotion allowed';
 exception when invalid_parameter_value then null; end;
 begin
   perform public.change_receipt_staff(a,a,null);
   raise exception 'Self removal allowed';
 exception when invalid_parameter_value then null; end;
 begin
   perform public.change_receipt_staff(a,c,'owner');
   raise exception 'Invalid role allowed';
 exception when invalid_parameter_value then null; end;
 perform public.change_receipt_staff(a,c,'cashier');
 if (select role from public.admin_users where user_id=c) <> 'cashier' then raise exception 'Role unchanged'; end if;
 perform public.change_receipt_staff(a,c,null);
 if exists(select 1 from public.admin_users where user_id=c) then raise exception 'Access retained'; end if;
 perform public.change_receipt_staff(a,b,'viewer');
 -- The second request must recheck its actor after the first SU demotes it.
 begin
   perform public.change_receipt_staff(b,a,'viewer');
   raise exception 'Stale SU authorization allowed';
 exception when insufficient_privilege then null; end;
 begin
   delete from public.admin_users where user_id=a;
   raise exception 'Last SU deletion allowed';
 exception when invalid_parameter_value then null; end;
 begin
   update public.admin_users set role='viewer' where user_id=a;
   raise exception 'Last SU demotion allowed';
 exception when invalid_parameter_value then null; end;
 begin
   delete from public.admin_users;
   raise exception 'Bulk deletion of last SU allowed';
 exception when invalid_parameter_value then null; end;
 if (select count(*) from public.admin_users where role='superuser') <> 1 then raise exception 'SU invariant broken'; end if;
 if has_function_privilege('authenticated','public.change_receipt_staff(uuid,uuid,text)','EXECUTE')
 or has_function_privilege('anon','public.change_receipt_staff(uuid,uuid,text)','EXECUTE') then raise exception 'Client can forge actor'; end if;
end $$;
rollback;
