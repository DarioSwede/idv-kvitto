create table public.receipt_submissions (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null check (char_length(sender_name) between 1 and 200),
  sender_email text not null check (char_length(sender_email) between 3 and 320),
  event_tag text not null default '' check (char_length(event_tag) <= 300),
  other_info text not null default '' check (char_length(other_info) <= 5000),
  amount_total numeric(12,2) check (amount_total is null or amount_total >= 0),
  cc_self boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.receipt_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.receipt_submissions(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

alter table public.receipt_submissions enable row level security;
alter table public.receipt_files enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipt-files',
  'receipt-files',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;;
