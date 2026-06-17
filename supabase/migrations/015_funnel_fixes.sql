-- 015_funnel_fixes.sql — Phase 2 funnel fixes
-- (a) Add estimate columns to orders so the brief's rough estimate is carried
--     onto the order and shown in the client workspace (quote_total still wins).
-- (b) Make claim_my_orders() case-insensitive so an order captured as
--     Jane@Gmail.com links to a jane@gmail.com magic-link sign-in.

alter table public.orders
  add column if not exists estimate_usd numeric,
  add column if not exists deposit_usd  numeric;

create or replace function public.claim_my_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
  user_email    text;
  actor_label   text;
begin
  select email into user_email from auth.users where id = auth.uid();

  update public.orders
  set client_id = auth.uid(), updated_at = now()
  where lower(client_email) = lower(user_email)
    and client_id is null;

  get diagnostics claimed_count = row_count;

  select coalesce(name, email) into actor_label
  from public.profiles where id = auth.uid();

  if claimed_count > 0 then
    insert into public.order_log (order_id, actor_name, event)
    select id, actor_label, 'Account linked — order claimed after sign-in'
    from public.orders
    where client_id = auth.uid()
      and updated_at >= now() - interval '5 seconds';
  end if;

  return claimed_count;
end;
$$;

revoke all on function public.claim_my_orders() from public;
grant execute on function public.claim_my_orders() to authenticated;
