insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipt-files','receipt-files',false,10485760,array['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

update public.app_settings
set value='"betala@idrottsveteranerna.se"'::jsonb,updated_at=now()
where key='receipt_email_to';
