-- 037_orders_archive.sql — soft-archive for orders.
-- When an admin deletes a client who still has open work, they can choose to
-- ARCHIVE the orders (preserve the records, drop them from active views) instead
-- of purging them. Archived orders are excluded from the admin lists/counts and
-- the client/expert views, but remain in the DB for records/audit.
alter table public.orders add column if not exists archived_at timestamptz;
create index if not exists idx_orders_archived_at on public.orders(archived_at);
