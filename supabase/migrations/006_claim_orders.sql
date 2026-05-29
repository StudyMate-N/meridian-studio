-- ─── CLAIM MY ORDERS ─────────────────────────────────────────────────────────
-- Called after client sign-in. Finds all orders where client_email matches
-- the signed-in user's email and client_id is NULL, then sets client_id.
-- Uses security definer so it can bypass RLS to update orders.

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
  -- Get the email of the calling user
  select email into user_email from auth.users where id = auth.uid();

  -- Claim all orders matching the email that are unlinked
  update public.orders
  set
    client_id  = auth.uid(),
    updated_at = now()
  where
    client_email = user_email
    and client_id is null;

  get diagnostics claimed_count = row_count;

  -- Get actor name for logging
  select coalesce(name, email) into actor_label
  from public.profiles
  where id = auth.uid();

  -- Log the claim event on each newly-claimed order
  if claimed_count > 0 then
    insert into public.order_log (order_id, actor_name, event)
    select
      id,
      actor_label,
      'Account linked — order claimed after sign-in'
    from public.orders
    where
      client_id  = auth.uid()
      and updated_at >= now() - interval '5 seconds';
  end if;

  return claimed_count;
end;
$$;

-- Revoke from public, grant only to authenticated users
revoke all on function public.claim_my_orders() from public;
grant execute on function public.claim_my_orders() to authenticated;
