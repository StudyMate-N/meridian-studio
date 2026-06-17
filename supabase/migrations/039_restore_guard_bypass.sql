-- 039_restore_guard_bypass.sql — fix: expert onboarding is 100% broken.
--
-- Symptom: admin "Onboard expert" → createUser returns 500
-- (AuthRetryableFetchError, empty body) → the edge function surfaces "{}".
--
-- Root cause: a regression introduced by 033. Migration 017 added a trusted-path
-- bypass flag (`app.bypass_guard='on'`) that the SECURITY DEFINER auto-link
-- functions (link_writer_on_profile / claim_writer_profile / the backfill) set
-- while they legitimately write profile_id + role, and BOTH guard triggers
-- honoured it. Migration 033 (privilege-column hardening) `create or replace`d
-- guard_profile_privileged + guard_writer_update to add the client_type /
-- welcome_sent / mpesa_verified / rating checks — but DROPPED the bypass-flag
-- honour. It relied on `auth.role()='service_role'` instead.
--
-- That assumption fails for the one path that matters here: when the edge
-- function calls auth.admin.createUser, the auth.users INSERT (and its
-- on_auth_user_created → handle_new_user → on_profile_link_writer chain) runs
-- inside GoTrue's own transaction as `supabase_auth_admin`, where there is no
-- request JWT — so auth.role() is NOT 'service_role' and get_user_role() is not
-- 'admin'. link_writer_on_profile then UPDATEs writers.profile_id (null → new
-- id), guard_writer_update sees a "privileged" change, raises, and the whole
-- createUser rolls back. onboard-expert always inserts the writers row first, so
-- the auto-link always fires → expert onboarding always 500s. (onboard-client
-- never creates a writers row, so it was unaffected — matching the report.)
--
-- Fix: re-create both guards = 033's hardening PLUS the 017 bypass-flag honour at
-- the top. No privilege is lost: only our own SECURITY DEFINER functions can set
-- app.bypass_guard, and they only ever link a writers row to a profile that
-- shares its email. Everything a normal user could attempt is still blocked.

-- ── profiles guard: bypass-aware + 033 hardening ────────────────────────────
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_privileged boolean;
begin
  -- trusted SECURITY DEFINER link path (017) — e.g. link_writer_on_profile
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  is_privileged := coalesce(public.get_user_role(), '') = 'admin'
                or coalesce(auth.role(), '') = 'service_role';
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

-- ── writers guard: bypass-aware + 033 hardening ─────────────────────────────
create or replace function public.guard_writer_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- trusted SECURITY DEFINER link path (017) — sets profile_id on auto-link
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
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
  -- payout trust gate: a writer may RESET their own verification to false, but
  -- may never self-VERIFY. Only an admin can set mpesa_verified = true.
  if new.mpesa_verified = true and old.mpesa_verified is distinct from true then
    raise exception 'not allowed to self-verify M-Pesa payout';
  end if;
  return new;
end $$;
