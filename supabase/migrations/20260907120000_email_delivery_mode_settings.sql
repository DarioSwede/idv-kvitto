alter table public.admin_users
drop constraint if exists admin_users_role_check;

alter table public.admin_users
add constraint admin_users_role_check
check (role in ('admin','cashier','tester','viewer'));

insert into public.app_settings (key, value, description, is_public)
values
  ('email_delivery_mode', '"production"'::jsonb, 'E-postläge: production, test eller disabled', true),
  ('email_test_recipient', '"mail@torbjornzimmerman.se"'::jsonb, 'Mottagare när testläge är aktivt', true),
  ('receipt_email_to', '"betala@idrottsveteranerna.se"'::jsonb, 'Produktionsmottagare för inskickade kvitton', true)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
