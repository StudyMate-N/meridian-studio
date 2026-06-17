-- 027_payment_links.sql — Indirect (link-based) payment flow + welcome email.
-- Adapted to THIS stack (text status/method, get_user_role(), no notification_type
-- enum) — the vendor's schema-email-patch.sql assumes enums that don't exist here.
--
-- Adds: indirect-method statuses on invoices, link timing columns, a profiles
-- welcome flag, and the payment_links table the admin writes when pasting a
-- Wise/Payoneer platform link.

-- ── 1. INVOICE STATUS — add the indirect-flow states ─────────────────────────
-- Existing: unpaid, payment_declared, payment_flagged, paid.
-- New: details_sent (direct email sent), link_pending (indirect: admin notified),
--      link_sent (indirect: link emailed to client).
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in (
    'unpaid', 'details_sent', 'link_pending', 'link_sent',
    'payment_declared', 'payment_flagged', 'paid'
  ));

-- ── 2. INVOICE TIMING COLUMNS (indirect flow) ─────────────────────────────────
alter table public.invoices
  add column if not exists link_pending_at timestamptz,   -- indirect: admin alerted
  add column if not exists link_sent_at    timestamptz;   -- indirect: link emailed

-- ── 3. PROFILES — first-delivery welcome flag (per client) ───────────────────
alter table public.profiles
  add column if not exists welcome_sent boolean not null default false;

-- ── 4. PAYMENT LINKS TABLE ────────────────────────────────────────────────────
-- One platform-generated link per invoice (admin pastes it). Replaced on resend.
create table if not exists public.payment_links (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  client_id   uuid not null references public.profiles(id) on delete cascade,
  method      text not null check (method in ('wise', 'payoneer')),
  link_url    text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  expires_at  timestamptz,
  unique (invoice_id)
);

create index if not exists idx_payment_links_invoice_id on public.payment_links(invoice_id);
create index if not exists idx_payment_links_client_id  on public.payment_links(client_id);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
alter table public.payment_links enable row level security;

drop policy if exists "payment_links_admin_all" on public.payment_links;
create policy "payment_links_admin_all" on public.payment_links
  for all using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- Clients may read only their own link, and only once it has been sent.
drop policy if exists "payment_links_client_read" on public.payment_links;
create policy "payment_links_client_read" on public.payment_links
  for select using (client_id = auth.uid() and sent_at is not null);

-- ── 6. REALTIME (so the portal can show the link the moment admin sends it) ───
do $$ begin
  alter publication supabase_realtime add table public.payment_links;
exception when duplicate_object then null; end $$;
alter table public.payment_links replica identity full;
