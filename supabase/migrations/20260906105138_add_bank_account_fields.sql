alter table public.receipt_submissions
  add column if not exists bank_clearing_number text,
  add column if not exists bank_account_number text;

alter table public.receipt_submissions
  drop constraint if exists receipt_submissions_bank_clearing_number_check,
  add constraint receipt_submissions_bank_clearing_number_check
    check (bank_clearing_number is null or bank_clearing_number ~ '^\d{4}$'),
  drop constraint if exists receipt_submissions_bank_account_number_check,
  add constraint receipt_submissions_bank_account_number_check
    check (bank_account_number is null or bank_account_number ~ '^\d{7,12}$');

comment on column public.receipt_submissions.bank_clearing_number is
  'Fyrsiffrigt clearingnummer. Åtkomst skyddas av receipt_submissions RLS.';
comment on column public.receipt_submissions.bank_account_number is
  'Kontonummer utan clearingnummer. Åtkomst skyddas av receipt_submissions RLS.';
