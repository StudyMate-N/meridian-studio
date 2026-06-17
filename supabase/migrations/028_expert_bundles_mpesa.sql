-- 028_expert_bundles_mpesa.sql — Expert workspace redesign backend.
--   • M-Pesa payout fields on writers (replaces payout_email in the UI).
--   • Multi-part / bundled orders: order_parts table + per-part file scoping
--     (order_files.part_id) + a per-part status RPC mirroring writer_set_status.
-- words / format / deadline_tier stay DERIVED in the UI (no columns added).

-- ── 1. WRITERS — M-Pesa payout ────────────────────────────────────────────────
alter table public.writers
  add column if not exists mpesa_number   text,
  add column if not exists mpesa_name     text,
  add column if not exists mpesa_verified boolean not null default false;

-- ── 2. ORDER PARTS — one row per deliverable in a bundled order ───────────────
create table if not exists public.order_parts (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  idx          int  not null default 1,                 -- display order (1-based)
  title        text not null,
  pages        int,
  citation     text,
  due_date     date,
  status       text not null default 'assigned'
    check (status in ('assigned','writing','in_review','revision','delivered','closed')),
  requirements text,                                     -- newline / bullet separated
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists update_order_parts_updated_at on public.order_parts;
create trigger update_order_parts_updated_at
  before update on public.order_parts
  for each row execute function public.handle_updated_at();

create index if not exists idx_order_parts_order_id on public.order_parts(order_id);

-- ── 3. ORDER FILES — scope a submission file to a specific part ───────────────
alter table public.order_files
  add column if not exists part_id uuid references public.order_parts(id) on delete set null;
create index if not exists idx_order_files_part_id on public.order_files(part_id);

-- ── 4. RLS on order_parts ─────────────────────────────────────────────────────
alter table public.order_parts enable row level security;

-- Assigned expert reads parts of their own orders.
drop policy if exists "order_parts_writer_read" on public.order_parts;
create policy "order_parts_writer_read" on public.order_parts
  for select using (exists (
    select 1 from public.orders o join public.writers w on w.id = o.writer_id
    where o.id = order_parts.order_id and w.profile_id = auth.uid()
  ));

-- Client reads parts of their own orders (for the client surface later).
drop policy if exists "order_parts_client_read" on public.order_parts;
create policy "order_parts_client_read" on public.order_parts
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_parts.order_id and o.client_id = auth.uid()
  ));

-- Admin full access.
drop policy if exists "order_parts_admin_all" on public.order_parts;
create policy "order_parts_admin_all" on public.order_parts
  for all using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ── 5. PER-PART STATUS RPC (mirrors writer_set_status guard) ─────────────────
-- Expert may move a part assigned→writing or writing|revision→in_review only,
-- and only on a part belonging to an order assigned to them.
create or replace function public.writer_set_part_status(p_part uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
declare w_id uuid; w_name text; v_order uuid; v_title text; ok boolean;
begin
  select id, name into w_id, w_name from public.writers where profile_id = auth.uid();
  if w_id is null then return false; end if;
  if p_status not in ('writing', 'in_review') then return false; end if;

  update public.order_parts pt
    set status = p_status, updated_at = now()
    where pt.id = p_part
      and exists (select 1 from public.orders o where o.id = pt.order_id and o.writer_id = w_id)
    returning pt.order_id, pt.title into v_order, v_title;
  ok := v_order is not null;

  if ok then
    insert into public.order_log (order_id, actor_name, event)
    values (v_order, w_name,
      case when p_status = 'writing' then 'Expert started work · ' || v_title
           else 'Expert submitted for review · ' || v_title end);
  end if;
  return coalesce(ok, false);
end;
$$;
revoke all on function public.writer_set_part_status(uuid, text) from public;
grant execute on function public.writer_set_part_status(uuid, text) to authenticated;

-- ── 5b. EXTEND writer_invitations — return the intake fields so the read-only
-- invitation preview can render the brief and pay derives from pages × $2.32.
drop function if exists public.writer_invitations();
create or replace function public.writer_invitations()
returns table (
  id uuid, ref text, client_code text, title text, program text, discipline text,
  level_label text, scope_label text, pages int, citation text, requirements text,
  notes text, due_date date, created_at timestamptz, priority text,
  rate_writing numeric, rate_project numeric
)
language plpgsql security definer set search_path = public as $$
declare w_id uuid;
begin
  select id into w_id from public.writers where profile_id = auth.uid();
  if w_id is null then return; end if;
  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program, o.program, o.discipline,
           o.level_label, o.scope_label, o.pages, o.citation, o.requirements,
           o.notes, o.due_date, o.created_at, o.priority, o.rate_writing, o.rate_project
    from public.orders o
    where o.invited_writer_id = w_id
      and o.invitation_status = 'pending'
      and o.writer_id is null
    order by o.created_at desc;
end; $$;
revoke all on function public.writer_invitations() from public;
grant execute on function public.writer_invitations() to authenticated;

-- ── 6. REALTIME ───────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.order_parts;
exception when duplicate_object then null; end $$;
alter table public.order_parts replica identity full;
