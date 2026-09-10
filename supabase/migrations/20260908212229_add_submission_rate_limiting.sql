-- Server-only request ledger used by the public receipt Edge Function.
create table if not exists public.receipt_rate_limit_attempts (
  id bigint generated always as identity primary key,
  limiter_key text not null,
  attempted_at timestamptz not null default now()
);

alter table public.receipt_rate_limit_attempts enable row level security;
revoke all on public.receipt_rate_limit_attempts from public, anon, authenticated;

create index if not exists receipt_rate_limit_attempts_lookup_idx
on public.receipt_rate_limit_attempts(limiter_key, attempted_at desc);

create or replace function public.check_receipt_rate_limit(
  p_limiter_key text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  oldest_attempt timestamptz;
begin
  if length(p_limiter_key) < 16 or p_window_seconds < 1 or p_max_requests < 1 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_limiter_key, 0));

  delete from public.receipt_rate_limit_attempts
  where attempted_at < now() - make_interval(secs => greatest(86400, p_window_seconds));

  select count(*), min(attempted_at)
  into recent_count, oldest_attempt
  from public.receipt_rate_limit_attempts
  where limiter_key = p_limiter_key
    and attempted_at >= now() - make_interval(secs => p_window_seconds);

  if recent_count >= p_max_requests then
    return query select false, greatest(1, ceil(extract(epoch from (oldest_attempt + make_interval(secs => p_window_seconds) - now())))::integer);
    return;
  end if;

  insert into public.receipt_rate_limit_attempts(limiter_key) values (p_limiter_key);
  return query select true, 0;
end;
$$;

revoke all on function public.check_receipt_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_receipt_rate_limit(text, integer, integer) to service_role;

insert into public.app_settings(key,value,description,is_public) values
  ('submission_rate_limit_requests','5'::jsonb,'Högsta antal inskick per begränsningsfönster',false),
  ('submission_rate_limit_window_seconds','600'::jsonb,'Rate-limit-fönster i sekunder',false)
on conflict (key) do nothing;
