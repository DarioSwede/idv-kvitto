insert into public.app_settings (key, value, description, is_public)
values (
  'admin_login_visible',
  'true'::jsonb,
  'Visa länken till administrationens inloggning längst ned i det publika kvittoformuläret',
  true
)
on conflict (key) do nothing;
