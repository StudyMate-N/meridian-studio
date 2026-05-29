-- ─── ENABLE SUPABASE REALTIME ─────────────────────────────────────────────────
-- Required for postgres_changes subscriptions in the admin dashboard.
-- Tables must be in the supabase_realtime publication for live events to fire.

-- Orders: new order toast + live status/payment updates on kanban/table
alter publication supabase_realtime add table public.orders;

-- Order messages: live chat in the Messages drawer tab
alter publication supabase_realtime add table public.order_messages;

-- Order log: live activity timeline in the Log drawer tab
alter publication supabase_realtime add table public.order_log;

-- Ensure full row data is sent on UPDATE (needed for payload.new to include all columns)
alter table public.orders        replica identity full;
alter table public.order_messages replica identity full;
alter table public.order_log     replica identity full;
