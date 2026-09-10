alter table public.receipt_files add column display_name text not null default '' check (char_length(display_name) <= 200);
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif','application/pdf'] where id = 'receipt-files';;
