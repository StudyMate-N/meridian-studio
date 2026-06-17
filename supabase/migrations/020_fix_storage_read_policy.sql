-- 020_fix_storage_read_policy.sql
-- Fix: experts couldn't DOWNLOAD the student's rubric (signed-URL creation needs
-- SELECT on the storage object). The writer-read storage policy (016) used the
-- same inline orders/writers sub-query that broke uploads — unreliable inside the
-- storage RLS evaluation. Consolidate the client + writer read policies into one
-- that uses the SECURITY DEFINER is_order_participant() helper (from 018).

drop policy if exists "order_files_client_read" on storage.objects;
drop policy if exists "order_files_writer_read" on storage.objects;
drop policy if exists "order_files_participant_read" on storage.objects;

create policy "order_files_participant_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-files'
    and public.is_order_participant(((storage.foldername(name))[1])::uuid)
  );
-- (admins keep full read via order_files_admin_all)
