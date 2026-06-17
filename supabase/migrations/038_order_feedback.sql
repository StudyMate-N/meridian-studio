-- 038_order_feedback.sql — post-delivery client feedback (rating + comment).
--
-- After an order is released (delivered/closed), the client may leave a 1–5 star
-- rating and an optional comment. One feedback row per order (the client can
-- update it). Admins see it read-only in the order drawer; experts have no access.
--
-- Additive + non-destructive: a new table only, no changes to existing tables.

-- ── 1. TABLE ──────────────────────────────────────────────────────────────────
create table if not exists public.order_feedback (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  client_id   uuid references public.profiles(id),
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- One feedback per order — the client upserts on order_id (update in place).
create unique index if not exists idx_order_feedback_order_id
  on public.order_feedback(order_id);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────
alter table public.order_feedback enable row level security;

-- Client SELECT own — feedback on an order they own.
drop policy if exists "order_feedback_client_read" on public.order_feedback;
create policy "order_feedback_client_read" on public.order_feedback
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_feedback.order_id
        and o.client_id = auth.uid()
    )
  );

-- Client INSERT own — only on a released (delivered/closed) order they own.
drop policy if exists "order_feedback_client_insert" on public.order_feedback;
create policy "order_feedback_client_insert" on public.order_feedback
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_feedback.order_id
        and o.client_id = auth.uid()
        and o.status in ('delivered', 'closed')
    )
  );

-- Client UPDATE own — revise their rating/comment on a released order they own.
drop policy if exists "order_feedback_client_update" on public.order_feedback;
create policy "order_feedback_client_update" on public.order_feedback
  for update to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_feedback.order_id
        and o.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_feedback.order_id
        and o.client_id = auth.uid()
        and o.status in ('delivered', 'closed')
    )
  );

-- Admin SELECT all (read-only) — service_role bypasses RLS entirely.
drop policy if exists "order_feedback_admin_read" on public.order_feedback;
create policy "order_feedback_admin_read" on public.order_feedback
  for select
  using (public.get_user_role() = 'admin');

-- Experts: NO policy — they have no access to client feedback.

-- ── 3. INDEXES + REALTIME ─────────────────────────────────────────────────────
create index if not exists idx_order_feedback_client_id on public.order_feedback(client_id);

alter table public.order_feedback replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.order_feedback;
exception when duplicate_object then null; end $$;
