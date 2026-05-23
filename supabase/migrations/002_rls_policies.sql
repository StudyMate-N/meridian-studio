-- Enable RLS on all tables
alter table public.profiles       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_files    enable row level security;
alter table public.order_messages enable row level security;
alter table public.order_log      enable row level security;
alter table public.payments       enable row level security;
alter table public.writers        enable row level security;

-- ─── HELPER: get current user role ───────────────────────────────────────────
create or replace function public.get_user_role()
returns user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create policy "profiles_own_read"   on public.profiles for select using (id = auth.uid());
create policy "profiles_own_update" on public.profiles for update using (id = auth.uid());
create policy "profiles_admin_read" on public.profiles for select using (get_user_role() = 'admin');
create policy "profiles_admin_all"  on public.profiles for all    using (get_user_role() = 'admin');

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
-- Public insert: unauthenticated clients can submit orders
create policy "orders_public_insert" on public.orders for insert with check (true);
-- Clients read their own orders
create policy "orders_client_read"   on public.orders for select using (client_id = auth.uid());
-- Writers read their assigned orders
create policy "orders_writer_read"   on public.orders for select using (
  writer_id in (select id from public.writers where profile_id = auth.uid())
);
-- Admins have full access
create policy "orders_admin_all"     on public.orders for all using (get_user_role() = 'admin');

-- ─── ORDER FILES ──────────────────────────────────────────────────────────────
create policy "files_client_read" on public.order_files for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);
create policy "files_client_insert" on public.order_files for insert with check (
  order_id in (select id from public.orders where client_id = auth.uid())
);
create policy "files_writer_read" on public.order_files for select using (
  order_id in (
    select o.id from public.orders o
    join public.writers w on w.id = o.writer_id
    where w.profile_id = auth.uid()
  )
);
create policy "files_admin_all" on public.order_files for all using (get_user_role() = 'admin');

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
create policy "messages_client_read" on public.order_messages for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
  and is_internal = false
);
create policy "messages_client_insert" on public.order_messages for insert with check (
  order_id in (select id from public.orders where client_id = auth.uid())
  and is_internal = false
);
create policy "messages_writer_read" on public.order_messages for select using (
  order_id in (
    select o.id from public.orders o
    join public.writers w on w.id = o.writer_id
    where w.profile_id = auth.uid()
  )
  and is_internal = false
);
create policy "messages_admin_all" on public.order_messages for all using (get_user_role() = 'admin');

-- ─── ORDER LOG ────────────────────────────────────────────────────────────────
create policy "log_client_read" on public.order_log for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);
create policy "log_admin_all" on public.order_log for all using (get_user_role() = 'admin');

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
create policy "payments_client_read" on public.payments for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);
create policy "payments_admin_all" on public.payments for all using (get_user_role() = 'admin');

-- ─── WRITERS ──────────────────────────────────────────────────────────────────
create policy "writers_own_read"  on public.writers for select using (profile_id = auth.uid());
create policy "writers_admin_all" on public.writers for all    using (get_user_role() = 'admin');
