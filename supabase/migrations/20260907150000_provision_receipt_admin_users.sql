-- Give the known project administrators access to the receipt admin API.
-- This only links existing Supabase Auth users; it does not create users or passwords.
insert into public.admin_users(user_id, role)
select id, 'admin'
from auth.users
where lower(email) in (
  't.zimm@protonmail.com',
  'darioswede@gmail.com',
  'mail@torbjornzimmerman.se'
)
on conflict (user_id) do update
set role = 'admin';
