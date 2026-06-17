-- 017_writer_link_fix.sql
-- Fix: the Phase-1 security guards (014) block the writer auto-link path (011),
-- so experts sign in but their profile is never linked / promoted to 'writer'
-- (they land on "Not an expert account").
--
-- Approach: give the TRUSTED onboarding code a transaction-local bypass flag the
-- guards honour. Everything else stays fully guarded (no privilege escalation):
--   * guard_profile_privileged still blocks role changes by normal users
--   * guard_writer_update still blocks writer-row tampering by normal users
-- Only code that sets app.bypass_guard='on' (our SECURITY DEFINER functions)
-- may perform the link. Plus a self-healing RPC the /expert app calls on load.

-- ── guards honour the trusted-path bypass flag ──────────────────────────────
create or replace function public.guard_profile_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'not allowed to change profile id';
  end if;
  -- Block escalation to/from admin by non-admins. (Setting role to 'writer' on
  -- its own grants nothing without a linked writers row, which users cannot
  -- create, so we only hard-block the admin transitions here.)
  if new.role is distinct from old.role
     and (new.role = 'admin' or old.role = 'admin')
     and coalesce(public.get_user_role(), '') <> 'admin' then
    raise exception 'not allowed to change role';
  end if;
  return new;
end $$;

create or replace function public.guard_writer_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.bypass_guard', true), '') = 'on' then
    return new;
  end if;
  if coalesce(public.get_user_role(), '') = 'admin' then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.profile_id is distinct from old.profile_id
     or new.email is distinct from old.email
     or new.active is distinct from old.active then
    raise exception 'not allowed to change privileged writer fields';
  end if;
  return new;
end $$;

-- ── auto-link trigger now flips the bypass flag while it links ───────────────
create or replace function public.link_writer_on_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);

  update public.writers
    set profile_id = new.id
    where lower(email) = lower(new.email) and profile_id is null;

  if exists (select 1 from public.writers where lower(email) = lower(new.email)) then
    update public.profiles set role = 'writer'
      where id = new.id and role <> 'admin';
  end if;

  perform set_config('app.bypass_guard', 'off', true);
  return new;
end $$;

-- ── self-healing RPC: /expert calls this if it isn't linked yet ──────────────
-- Runs as the signed-in user; links THEIR own writers row by matching email and
-- promotes their profile. Safe: only ever links a writers row whose email equals
-- the caller's verified auth email, and never touches anyone else.
create or replace function public.claim_writer_profile()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  my_email text;
  did boolean := false;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then return false; end if;

  perform set_config('app.bypass_guard', 'on', true);

  update public.writers
    set profile_id = auth.uid()
    where lower(email) = lower(my_email)
      and (profile_id is null or profile_id = auth.uid());

  if exists (select 1 from public.writers where lower(email) = lower(my_email) and profile_id = auth.uid()) then
    update public.profiles set role = 'writer'
      where id = auth.uid() and role <> 'admin';
    did := true;
  end if;

  perform set_config('app.bypass_guard', 'off', true);
  return did;
end $$;

grant execute on function public.claim_writer_profile() to authenticated;

-- ── backfill: link every unlinked writer that already has a profile ─────────
do $$
begin
  perform set_config('app.bypass_guard', 'on', true);

  update public.writers w
    set profile_id = p.id
    from public.profiles p
    where w.profile_id is null and lower(w.email) = lower(p.email);

  update public.profiles p set role = 'writer'
    where role <> 'admin'
      and exists (select 1 from public.writers w where lower(w.email) = lower(p.email));

  perform set_config('app.bypass_guard', 'off', true);
end $$;
