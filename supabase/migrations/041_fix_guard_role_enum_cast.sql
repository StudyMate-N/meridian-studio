-- 041_fix_guard_role_enum_cast.sql — stop the brief/order flow 400-ing.
--
-- Symptom: submitting a brief from the workspace makes claim_my_orders() (and the
-- invoice/unpaid-count chain it triggers) fail with
--   22P02  invalid input value for enum user_role: ""
--
-- Cause: the privilege guards test `coalesce(public.get_user_role(), '') = 'admin'`.
-- get_user_role() returns the user_role ENUM, so the untyped '' is coerced to
-- user_role — and when get_user_role() is NULL (e.g. in the nested
-- SECURITY DEFINER trigger chain claim_my_orders → create_invoice_for_order →
-- recalculate_unpaid_invoice_count → UPDATE profiles → guard_profile_privileged),
-- coalesce evaluates ''::user_role and throws. 026 fixed this once; 033 (and my
-- 039) reintroduced it.
--
-- Fix: cast the enum to text BEFORE coalescing, so the fallback is a plain '' and
-- no value is ever coerced into the enum. Behaviour is otherwise identical to 039
-- (trusted-path bypass + all 033 hardening preserved).

create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_privileged boolean;
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  is_privileged := coalesce(public.get_user_role()::text, '') = 'admin'
                or coalesce(auth.role(), '') = 'service_role';
  if new.id is distinct from old.id then
    raise exception 'not allowed to change profile id';
  end if;
  if not is_privileged then
    if new.role is distinct from old.role then
      raise exception 'not allowed to change role';
    end if;
    if new.client_type is distinct from old.client_type then
      raise exception 'not allowed to change client_type';
    end if;
    if new.welcome_sent is distinct from old.welcome_sent then
      raise exception 'not allowed to change welcome_sent';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_writer_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  if coalesce(public.get_user_role()::text, '') = 'admin'
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.profile_id is distinct from old.profile_id
     or new.email is distinct from old.email
     or new.active is distinct from old.active
     or new.rating is distinct from old.rating then
    raise exception 'not allowed to change privileged writer fields';
  end if;
  if new.mpesa_verified = true and old.mpesa_verified is distinct from true then
    raise exception 'not allowed to self-verify M-Pesa payout';
  end if;
  return new;
end $$;
