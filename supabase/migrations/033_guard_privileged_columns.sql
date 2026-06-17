-- 033_guard_privileged_columns.sql — close two privilege-escalation gaps that
-- are reachable from the shipped frontend's own update calls.
--
-- P0-1: a client could `profiles.update({ client_type: 'custom' })` on their own
--   row. A 'custom' client is skipped by the auto-invoice trigger (025) and the
--   UI hides the pay gate, so self-flipping to custom lets orders reach delivery
--   with no invoice / no payment. guard_profile_privileged (014) only pinned
--   id + role, and profiles_own_update has no WITH CHECK.
-- P0-2: a writer could `writers.update({ mpesa_verified: true })` on their own
--   row, defeating the admin payout-verification gate (admin sets this after
--   confirming the M-Pesa number out of band). guard_writer_update (014) only
--   pinned id/profile_id/email/active.
--
-- Same approach as 014: BEFORE-UPDATE guard triggers (SECURITY DEFINER) so
-- admins (get_user_role()='admin') can still change everything. The trusted
-- server (service_role — used by the edge functions, e.g. send_welcome setting
-- welcome_sent) is also exempt; auth.role() reads the request JWT, which works
-- inside a SECURITY DEFINER context (it does NOT read the definer's DB role).
--
-- NOTE: unpaid_invoice_count is intentionally NOT guarded — it's maintained by
-- recalculate_unpaid_invoice_count() (025), a trigger that fires in the
-- authenticated client's own context during normal invoice actions; guarding it
-- would block legitimate payment-declaration. It's also recomputed from the
-- invoices table, so a manual write is overwritten on the next invoice event and
-- never bypasses billing (client_type does — that's the one that matters).

-- ── extend the profiles guard ───────────────────────────────────────────────
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_privileged boolean := coalesce(public.get_user_role(), '') = 'admin'
                        or coalesce(auth.role(), '') = 'service_role';
begin
  if new.id is distinct from old.id then
    raise exception 'not allowed to change profile id';
  end if;
  if not is_privileged then
    if new.role is distinct from old.role then
      raise exception 'not allowed to change role';
    end if;
    if new.client_type is distinct from old.client_type then
      raise exception 'not allowed to change client_type';   -- billing tier: admin-only
    end if;
    if new.welcome_sent is distinct from old.welcome_sent then
      raise exception 'not allowed to change welcome_sent';   -- set by send_welcome (service role)
    end if;
  end if;
  return new;
end $$;

-- ── extend the writers guard ────────────────────────────────────────────────
create or replace function public.guard_writer_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.get_user_role(), '') = 'admin'
     or coalesce(auth.role(), '') = 'service_role' then
    return new;  -- admins and the trusted server may change anything
  end if;
  if new.id is distinct from old.id
     or new.profile_id is distinct from old.profile_id
     or new.email is distinct from old.email
     or new.active is distinct from old.active
     or new.rating is distinct from old.rating then          -- reputation: admin-only
    raise exception 'not allowed to change privileged writer fields';
  end if;
  -- payout trust gate: a writer may RESET their own verification to false (the
  -- expert UI does this when M-Pesa details change, forcing admin re-check), but
  -- may never self-VERIFY. Only an admin can set mpesa_verified = true.
  if new.mpesa_verified = true and old.mpesa_verified is distinct from true then
    raise exception 'not allowed to self-verify M-Pesa payout';
  end if;
  return new;
end $$;

-- triggers already exist from 014 (trg_guard_profile_privileged,
-- trg_guard_writer_update) and point at these functions, so replacing the
-- function bodies is enough.
