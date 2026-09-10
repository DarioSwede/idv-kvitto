update public.app_settings
set value = '"mail@torbjornzimmerman.se"'::jsonb,
    updated_at = now()
where key = 'receipt_email_to';