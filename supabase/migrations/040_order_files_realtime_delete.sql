-- 040_order_files_realtime_delete.sql — make document REMOVAL propagate live.
--
-- Symptom: an admin deletes a document (delete-order-file removes the storage
-- object + the order_files row), but the client's open workspace keeps showing it
-- until a manual reload.
--
-- Cause: every surface subscribes to order_files with a column filter
-- (`order_id=eq.<id>`). A postgres_changes DELETE only matches a column filter
-- when the deleted row's OLD image contains that column — which requires the table
-- to have REPLICA IDENTITY FULL. 016 set this, but re-assert it here (idempotent)
-- so the guarantee is explicit and survives any drift, and confirm the table is on
-- the realtime publication.
--
-- (The client also got a belt-and-suspenders fix: an unfiltered DELETE listener +
--  poll. This migration fixes it at the source for admin/expert/client alike.)

alter table public.order_files replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_files'
  ) then
    alter publication supabase_realtime add table public.order_files;
  end if;
end $$;
