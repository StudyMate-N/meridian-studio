-- 018_fix_storage_upload_policy.sql
-- Fix: experts (and clients) got "new row violates row-level security policy"
-- when uploading a file to order-files.
--
-- Root cause: the participant-upload storage policy (migration 014) inlined
-- subqueries against public.orders / public.writers inside the storage.objects
-- INSERT `with check`. Those subqueries are themselves RLS-filtered, and during
-- the INSERT check evaluation they did not resolve the way the same expression
-- does in a plain SELECT — a known Postgres/Supabase gotcha. The branch tested
-- TRUE in isolation yet the INSERT was denied.
--
-- Fix: move the participant test into a SECURITY DEFINER helper that bypasses the
-- nested-RLS evaluation. It still only ever returns true for the order's own
-- client or the order's assigned writer (keyed on auth.uid()), so access is
-- unchanged — it just evaluates reliably inside the storage policy.

create or replace function public.is_order_participant(oid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
           select 1 from public.orders o
           where o.id = oid and o.client_id = auth.uid()
         )
      or exists (
           select 1 from public.orders o
           join public.writers w on w.id = o.writer_id
           where o.id = oid and w.profile_id = auth.uid()
         );
$$;

grant execute on function public.is_order_participant(uuid) to authenticated, anon;

drop policy if exists "order_files_participant_upload" on storage.objects;
create policy "order_files_participant_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-files'
    and public.is_order_participant(((storage.foldername(name))[1])::uuid)
  );
