-- 034_bundle_status_rollup.sql — keep order/expert/client status in sync.
--
-- Two long-standing divergences this fixes:
--
-- 1. BUNDLES: a multi-part order's parts (order_parts) each carry their own
--    status. The expert UI derives the order's overall status from its parts
--    (EM.bundleStatus), but nothing wrote that back to orders.status — so the
--    admin view and the CLIENT RELEASE GATE (MM.filesVisible, keyed on
--    orders.status) saw a stale order-level status. This trigger rolls the part
--    statuses up to orders.status whenever a part changes, mirroring
--    EM.bundleStatus precedence exactly. Single-deliverable orders (no parts)
--    are left untouched — admin still drives those directly.
--
-- 2. PAYMENTS: with the admin quick-buttons removed, the invoice is the single
--    source of truth. sync_order_on_invoice_paid already flipped the order to
--    paid_in_full when an invoice is confirmed; extend it so the order flips
--    BACK to unpaid if that invoice ever leaves 'paid' (flagged / re-opened),
--    so orders.payment_status can never contradict the invoice.

-- ── 1. part → order status rollup ───────────────────────────────────────────
create or replace function public.rollup_order_status_from_parts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order  uuid := coalesce(new.order_id, old.order_id);
  v_total  int;
  v_status text;
begin
  select count(*) into v_total from public.order_parts where order_id = v_order;
  if v_total = 0 then
    return coalesce(new, old);   -- no parts: leave the order's manual status alone
  end if;

  -- mirror EM.bundleStatus precedence (src/expert/expert-model.js)
  select case
           when bool_or(status = 'revision')                                  then 'revision'
           when bool_and(status in ('delivered', 'closed'))                   then 'delivered'
           when bool_and(status in ('in_review', 'delivered', 'closed'))      then 'in_review'
           when bool_or(status = 'writing')                                   then 'writing'
           else 'assigned'
         end
    into v_status
    from public.order_parts
   where order_id = v_order;

  update public.orders
     set status = v_status::order_status, updated_at = now()
   where id = v_order
     and status is distinct from v_status::order_status;

  return coalesce(new, old);
end $$;

drop trigger if exists trg_rollup_order_status on public.order_parts;
create trigger trg_rollup_order_status
  after insert or update of status or delete on public.order_parts
  for each row execute function public.rollup_order_status_from_parts();

-- ── 2. payment sync — also reset when an invoice leaves 'paid' ───────────────
create or replace function public.sync_order_on_invoice_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.orders set payment_status = 'paid_in_full', updated_at = now()
    where id = new.order_id;
  elsif old.status = 'paid' and new.status is distinct from 'paid' then
    update public.orders set payment_status = 'unpaid', updated_at = now()
    where id = new.order_id;
  end if;
  return new;
end; $$;
-- trigger trg_order_paid_sync (025) already points at this function.
