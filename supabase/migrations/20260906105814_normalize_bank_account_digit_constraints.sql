alter table public.receipt_submissions
  drop constraint if exists receipt_submissions_bank_clearing_number_check,
  add constraint receipt_submissions_bank_clearing_number_check
    check (bank_clearing_number is null or bank_clearing_number ~ '^[0-9]{4}$'),
  drop constraint if exists receipt_submissions_bank_account_number_check,
  add constraint receipt_submissions_bank_account_number_check
    check (bank_account_number is null or bank_account_number ~ '^[0-9]{7,12}$');
