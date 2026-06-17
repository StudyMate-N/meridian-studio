-- 025_invoices.sql — Invoice system + client types (from the handover package,
-- adapted to this stack: get_user_role() instead of is_admin(), auto-invoice via
-- order triggers since orders are created at brief submission).

-- ── 1. PROFILES — client type + payment fields ───────────────────────────────
alter table public.profiles
  add column if not exists client_type text not null default 'general'
    check (client_type in ('general', 'custom')),
  add column if not exists default_payment_method text,
  add column if not exists unpaid_invoice_count integer not null default 0,
  add column if not exists country text;

-- ── 2. INVOICES TABLE ─────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  client_id          uuid not null references public.profiles(id) on delete cascade,
  invoice_number     text not null unique,                -- e.g. MS-0011
  issued_date        timestamptz not null default now(),
  payment_terms      text not null default 'Due on receipt',
  line_items         jsonb not null default '[]'::jsonb,  -- [{description, sub_description, qty, rate, amount}]
  subtotal           numeric(10,2) not null default 0,
  total_due          numeric(10,2) not null default 0,
  status             text not null default 'unpaid'
    check (status in ('unpaid', 'payment_declared', 'payment_flagged', 'paid')),
  payment_method     text,
  note               text default 'Thank you for choosing Meridian Studio.',
  declared_at        timestamptz,
  declared_by        uuid references public.profiles(id),
  confirmed_by       uuid references public.profiles(id),
  paid_at            timestamptz,
  flagged_at         timestamptz,
  flag_note          text,
  details_sent_at    timestamptz,
  details_sent_count integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists update_invoices_updated_at on public.invoices;
create trigger update_invoices_updated_at
  before update on public.invoices
  for each row execute function public.handle_updated_at();

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
alter table public.invoices enable row level security;

drop policy if exists "invoices_client_read" on public.invoices;
create policy "invoices_client_read" on public.invoices
  for select using (client_id = auth.uid());

-- Clients may ONLY move unpaid → payment_declared (re-declares from flagged go
-- through the payments edge function with the service role).
drop policy if exists "invoices_client_declare" on public.invoices;
create policy "invoices_client_declare" on public.invoices
  for update using (client_id = auth.uid() and status = 'unpaid')
  with check (client_id = auth.uid() and status = 'payment_declared');

drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all" on public.invoices
  for all using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ── 4. NEXT INVOICE NUMBER (serialized) ───────────────────────────────────────
create or replace function public.get_next_invoice_number()
returns text language plpgsql security definer set search_path = public as $$
declare max_num integer; begin
  perform pg_advisory_xact_lock(202506);
  select coalesce(max(cast(regexp_replace(invoice_number, '^[A-Z]+-0*', '') as integer)), 10)
    into max_num from public.invoices where invoice_number ~ '^(MS|PM)-[0-9]+$';
  return 'MS-' || lpad((max_num + 1)::text, 4, '0');
end; $$;

-- ── 5. UNPAID COUNT MAINTENANCE ───────────────────────────────────────────────
create or replace function public.recalculate_unpaid_invoice_count(p_client_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set unpaid_invoice_count = (
    select count(*) from public.invoices
    where client_id = p_client_id
      and status in ('unpaid', 'payment_declared', 'payment_flagged')
  ) where id = p_client_id;
end; $$;

create or replace function public.trigger_recalculate_unpaid_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalculate_unpaid_invoice_count(coalesce(new.client_id, old.client_id));
  return coalesce(new, old);
end; $$;

drop trigger if exists recalculate_on_invoice_change on public.invoices;
create trigger recalculate_on_invoice_change
  after insert or update of status or delete on public.invoices
  for each row execute function public.trigger_recalculate_unpaid_count();

-- ── 6. AUTO-INVOICE — orders are created at brief submission ─────────────────
-- Creates the invoice when a GENERAL client's order exists AND is linked to a
-- profile (guest orders link moments after insert via ensure-client-auth/claim).
create or replace function public.create_invoice_for_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_type text; v_amount numeric; v_num text;
begin
  if new.client_id is null then return new; end if;
  if exists (select 1 from public.invoices where order_id = new.id) then return new; end if;
  select client_type into v_type from public.profiles where id = new.client_id;
  if coalesce(v_type, 'general') <> 'general' then return new; end if;
  v_amount := coalesce(new.quote_total, new.estimate_usd, 0);
  if v_amount <= 0 then return new; end if;
  v_num := public.get_next_invoice_number();
  insert into public.invoices (order_id, client_id, invoice_number, line_items, subtotal, total_due, status)
  values (
    new.id, new.client_id, v_num,
    jsonb_build_array(jsonb_build_object(
      'description', coalesce(nullif(new.program, ''), new.scope_label, 'Academic support'),
      'sub_description', trim(both ' · ' from coalesce(new.level_label, '') || ' · ' || coalesce(new.scope_label, '')),
      'qty', 1, 'rate', v_amount, 'amount', v_amount
    )),
    v_amount, v_amount, 'unpaid'
  );
  return new;
end; $$;

drop trigger if exists trg_order_invoice_insert on public.orders;
create trigger trg_order_invoice_insert after insert on public.orders
  for each row execute function public.create_invoice_for_order();

drop trigger if exists trg_order_invoice_link on public.orders;
create trigger trg_order_invoice_link after update of client_id on public.orders
  for each row when (old.client_id is distinct from new.client_id and new.client_id is not null)
  execute function public.create_invoice_for_order();

-- ── 7. QUOTE SYNC — admin's exact quote updates the open invoice ─────────────
create or replace function public.sync_invoice_to_quote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.invoices set
    line_items = jsonb_set(line_items, '{0,rate}', to_jsonb(new.quote_total)) ,
    subtotal = new.quote_total, total_due = new.quote_total
  where order_id = new.id and status in ('unpaid', 'payment_flagged');
  update public.invoices set
    line_items = jsonb_set(line_items, '{0,amount}', to_jsonb(new.quote_total))
  where order_id = new.id and status in ('unpaid', 'payment_flagged');
  return new;
end; $$;

drop trigger if exists trg_invoice_quote_sync on public.orders;
create trigger trg_invoice_quote_sync after update of quote_total on public.orders
  for each row when (old.quote_total is distinct from new.quote_total and new.quote_total is not null)
  execute function public.sync_invoice_to_quote();

-- ── 8. PAID SYNC — a paid invoice flips the order's payment_status ───────────
create or replace function public.sync_order_on_invoice_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.orders set payment_status = 'paid_in_full', updated_at = now()
    where id = new.order_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_order_paid_sync on public.invoices;
create trigger trg_order_paid_sync after update of status on public.invoices
  for each row execute function public.sync_order_on_invoice_paid();

-- ── 9. REALTIME + INDEXES ─────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.invoices;
exception when duplicate_object then null; end $$;
alter table public.invoices replica identity full;

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_order_id on public.invoices(order_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_profiles_client_type on public.profiles(client_type);
