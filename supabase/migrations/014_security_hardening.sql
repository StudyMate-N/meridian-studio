-- 014_security_hardening.sql — Phase 1 security fixes
-- S1: prevent privilege escalation via profiles.role; lock profile id.
-- S6: prevent writers from changing privileged columns on their own row.
-- S3: restrict order-files storage uploads to the order's client/assigned writer.
-- S4: harden the public orders insert (pin status/payment/quote).
--
-- S1 + S6 use BEFORE-UPDATE guard triggers (SECURITY DEFINER) rather than RLS
-- WITH CHECK so admins (get_user_role()='admin') can still change these fields.

-- ── S1: profiles role/id guard ──────────────────────────────────────────────
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id then
    raise exception 'not allowed to change profile id';
  end if;
  if new.role is distinct from old.role and coalesce(public.get_user_role(), '') <> 'admin' then
    raise exception 'not allowed to change role';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- ── S6: writers privileged-column guard ─────────────────────────────────────
create or replace function public.guard_writer_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.get_user_role(), '') = 'admin' then
    return new;  -- admins may change anything
  end if;
  if new.id is distinct from old.id
     or new.profile_id is distinct from old.profile_id
     or new.email is distinct from old.email
     or new.active is distinct from old.active then
    raise exception 'not allowed to change privileged writer fields';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_writer_update on public.writers;
create trigger trg_guard_writer_update
  before update on public.writers
  for each row execute function public.guard_writer_update();

-- ── S3: storage upload restricted to order participants ─────────────────────
drop policy if exists "order_files_client_upload" on storage.objects;
create policy "order_files_participant_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'order-files'
    and (
      exists (
        select 1 from public.orders o
        where o.id = ((storage.foldername(name))[1])::uuid
          and o.client_id = auth.uid()
      )
      or exists (
        select 1 from public.orders o
        join public.writers w on w.id = o.writer_id
        where o.id = ((storage.foldername(name))[1])::uuid
          and w.profile_id = auth.uid()
      )
    )
  );
-- (admins keep full access via the existing order_files_admin_all policy)

-- ── S4: harden public orders insert ─────────────────────────────────────────
drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert" on public.orders
  for insert
  with check (
    (client_id is null or client_id = auth.uid())
    and status = 'new'
    and payment_status = 'unpaid'
    and quote_total is null
  );
-- (admins insert quoted/assigned orders via orders_admin_all)
