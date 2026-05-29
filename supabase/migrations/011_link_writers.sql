-- ─── WRITER ONBOARDING: auto-link by email ──────────────────────────────────
-- When an expert signs in for the first time, a profile row is created. If the
-- admin has already added them to the writers roster (by email), link that
-- writers row to the new profile and grant the writer role — so /expert works
-- with no manual SQL.

create or replace function public.link_writer_on_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.writers
    set profile_id = new.id
    where lower(email) = lower(new.email) and profile_id is null;

  if exists (select 1 from public.writers where lower(email) = lower(new.email)) then
    update public.profiles set role = 'writer'
      where id = new.id and role <> 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_link_writer on public.profiles;
create trigger on_profile_link_writer
  after insert on public.profiles
  for each row execute function public.link_writer_on_profile();

-- Backfill: link any existing writers whose email already matches a profile.
update public.writers w
  set profile_id = p.id
  from public.profiles p
  where w.profile_id is null and lower(w.email) = lower(p.email);

update public.profiles p set role = 'writer'
  where role <> 'admin'
    and exists (select 1 from public.writers w where lower(w.email) = lower(p.email));
