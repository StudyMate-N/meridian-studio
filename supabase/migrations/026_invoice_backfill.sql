-- 026_invoice_backfill.sql
-- (0) FIX a latent bug in guard_profile_privileged (migration 017): it used
--     `coalesce(get_user_role(), '')`, but get_user_role() returns the user_role
--     ENUM — coalescing with '' casts '' to the enum and ERRORS whenever the
--     function returns NULL (any server-side / no-auth context). This blocked
--     every service-role profile write: invoice→recalc→profiles, and set_method.
-- (a) Make the quote-sync path CREATE an invoice if one doesn't exist yet.
-- (b) Backfill invoices for EXISTING general-client orders that predate 025.

-- ── (0) null-safe profile guard ──────────────────────────────────────────────
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id then
    raise exception 'not allowed to change profile id';
  end if;
  if new.role is distinct from old.role
     and (new.role = 'admin' or old.role = 'admin')
     and public.get_user_role() is distinct from 'admin'::user_role then
    raise exception 'not allowed to change role';
  end if;
  return new;
end $$;

-- ── (a) quote sync now creates-if-missing ───────────────────────────────────
create or replace function public.sync_invoice_to_quote()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_type text; v_num text;
begin
  if exists (select 1 from public.invoices where order_id = new.id) then
    update public.invoices set
      line_items = jsonb_set(jsonb_set(line_items, '{0,rate}', to_jsonb(new.quote_total)), '{0,amount}', to_jsonb(new.quote_total)),
      subtotal = new.quote_total, total_due = new.quote_total
    where order_id = new.id and status in ('unpaid', 'payment_flagged');
    return new;
  end if;
  -- no invoice yet → create one if this is a general client with a real amount
  if new.client_id is null or coalesce(new.quote_total, 0) <= 0 then return new; end if;
  select client_type into v_type from public.profiles where id = new.client_id;
  if coalesce(v_type, 'general') <> 'general' then return new; end if;
  v_num := public.get_next_invoice_number();
  insert into public.invoices (order_id, client_id, invoice_number, line_items, subtotal, total_due, status)
  values (
    new.id, new.client_id, v_num,
    jsonb_build_array(jsonb_build_object(
      'description', coalesce(nullif(new.program, ''), new.scope_label, 'Academic support'),
      'sub_description', trim(both ' · ' from coalesce(new.level_label, '') || ' · ' || coalesce(new.scope_label, '')),
      'qty', 1, 'rate', new.quote_total, 'amount', new.quote_total
    )),
    new.quote_total, new.quote_total, 'unpaid'
  );
  return new;
end; $$;

-- ── (b) one-time backfill for existing orders ────────────────────────────────
-- Targets unpaid, not-yet-released orders owned by a GENERAL client with a real
-- amount and no invoice yet. Uses quote_total when present, else estimate_usd.
do $$
declare r record; v_num text; v_amt numeric;
begin
  for r in
    select o.* from public.orders o
    join public.profiles p on p.id = o.client_id
    where o.client_id is not null
      and coalesce(p.client_type, 'general') = 'general'
      and o.status not in ('delivered', 'closed')
      and coalesce(o.payment_status, 'unpaid') = 'unpaid'
      and coalesce(o.quote_total, o.estimate_usd, 0) > 0
      and not exists (select 1 from public.invoices i where i.order_id = o.id)
    order by o.created_at
  loop
    v_amt := coalesce(r.quote_total, r.estimate_usd, 0);
    v_num := public.get_next_invoice_number();
    insert into public.invoices (order_id, client_id, invoice_number, line_items, subtotal, total_due, status, issued_date)
    values (
      r.id, r.client_id, v_num,
      jsonb_build_array(jsonb_build_object(
        'description', coalesce(nullif(r.program, ''), r.scope_label, 'Academic support'),
        'sub_description', trim(both ' · ' from coalesce(r.level_label, '') || ' · ' || coalesce(r.scope_label, '')),
        'qty', 1, 'rate', v_amt, 'amount', v_amt
      )),
      v_amt, v_amt, 'unpaid', coalesce(r.created_at, now())
    );
  end loop;
end $$;
