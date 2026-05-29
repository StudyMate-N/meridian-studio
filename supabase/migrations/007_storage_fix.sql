-- ─── STORAGE RLS FIX ─────────────────────────────────────────────────────────
-- Problem: files stored as {order.id}/{timestamp}-{filename} but the old
-- policy checked auth.uid() as the first folder segment — always denied.
-- Fix: drop the broken policy, replace with one that checks order ownership
-- via the orders table.

-- Drop the broken client read policy
drop policy if exists "order_files_owner_read" on storage.objects;

-- Replace with a policy that checks order ownership via the orders table.
-- File path format: {order_id}/{timestamp}-{filename}
-- The first folder segment IS the order UUID.
create policy "order_files_client_read" on storage.objects for select
  using (
    bucket_id = 'order-files'
    and (
      -- Admin access
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
      OR
      -- Client access: the first path segment (order UUID) belongs to one
      -- of the client's orders (where client_id = their auth.uid())
      (storage.foldername(name))[1]::uuid in (
        select id from public.orders
        where client_id = auth.uid()
      )
    )
  );
