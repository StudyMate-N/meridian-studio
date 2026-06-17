-- 016_writer_files_realtime.sql — Phase 3
-- (a) Let an assigned writer download the order's files (rubric/brief) — there
--     was no storage SELECT policy for writers, so signed-URL downloads failed.
-- (b) Put order_files on the realtime publication so a delivery appears live in
--     the client workspace (and admin-shared files appear live to the writer).

-- ── (a) writer storage read ─────────────────────────────────────────────────
drop policy if exists "order_files_writer_read" on storage.objects;
create policy "order_files_writer_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-files'
    and exists (
      select 1 from public.orders o
      join public.writers w on w.id = o.writer_id
      where o.id = ((storage.foldername(name))[1])::uuid
        and w.profile_id = auth.uid()
    )
  );

-- ── (b) realtime for order_files ────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_files'
  ) then
    alter publication supabase_realtime add table public.order_files;
  end if;
end $$;
alter table public.order_files replica identity full;
