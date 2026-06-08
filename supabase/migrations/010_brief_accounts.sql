-- ──────────────────────────────────────────────────────────────────────────────
-- 010_brief_accounts.sql
-- Link brief submissions to real client accounts so admins can see them on the
-- Clients page, and let clients read their own briefs in the workspace.
-- ──────────────────────────────────────────────────────────────────────────────

-- Capture the account identity on each brief.
alter table public.briefs add column if not exists email     text;
alter table public.briefs add column if not exists client_id uuid references public.profiles(id);

create index if not exists idx_briefs_client on public.briefs(client_id);

-- Clients can read briefs that belong to them.
drop policy if exists briefs_client_read on public.briefs;
create policy briefs_client_read
  on public.briefs for select
  using (client_id = auth.uid());

-- Retroactively link guest briefs (submitted before sign-in) to the
-- authenticated user, matched by email. Mirrors claim_my_orders().
create or replace function public.claim_my_briefs()
returns integer
language plpgsql
security definer
as $$
declare
  n integer;
begin
  update public.briefs
     set client_id = auth.uid()
   where client_id is null
     and lower(email) = lower(auth.jwt() ->> 'email');
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.claim_my_briefs() to authenticated;
