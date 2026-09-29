-- Stable display references. UUIDs remain the primary/foreign keys.
begin;
lock table public.receipt_submissions in access exclusive mode;
alter table public.receipt_submissions add column case_number text;
create sequence public.receipt_case_number_seq;
revoke all on sequence public.receipt_case_number_seq from public, anon, authenticated;
grant usage on sequence public.receipt_case_number_seq to service_role;

-- Number existing cases chronologically while writes are locked.
with numbered as (
  select id, created_at, row_number() over (order by created_at, id) as n
  from public.receipt_submissions
)
update public.receipt_submissions s
set case_number = to_char(n.created_at at time zone 'Europe/Stockholm', 'YYYY') || '-' ||
  lpad(n.n::text, greatest(4, length(n.n::text)), '0')
from numbered n where s.id = n.id;
select setval('public.receipt_case_number_seq', greatest(count(*), 1), count(*) > 0)
from public.receipt_submissions;

create function public.assign_receipt_case_number() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare n text;
begin
  if TG_OP = 'UPDATE' then
    if NEW.case_number is distinct from OLD.case_number then
      raise exception 'Case number cannot be changed';
    end if;
  else
    n := nextval('public.receipt_case_number_seq'::regclass)::text;
    NEW.case_number := to_char(NEW.created_at at time zone 'Europe/Stockholm', 'YYYY') || '-' ||
      lpad(n, greatest(4, length(n)), '0');
  end if;
  return NEW;
end;
$$;
revoke all on function public.assign_receipt_case_number() from public, anon, authenticated;
grant execute on function public.assign_receipt_case_number() to service_role;
create trigger assign_receipt_case_number before insert or update
on public.receipt_submissions for each row execute function public.assign_receipt_case_number();
alter table public.receipt_submissions
  alter column case_number set not null,
  add constraint receipt_submissions_case_number_key unique (case_number);
comment on column public.receipt_submissions.case_number is
  'Permanent display reference: Swedish submission year and global sequence, minimum four digits. Not reset annually; gaps are allowed. UUID remains the internal identifier.';
commit;
