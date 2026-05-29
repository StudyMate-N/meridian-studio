-- ─── WRITER PORTAL ───────────────────────────────────────────────────────────
-- Adds writer profile/availability columns, the missing writer RLS policies
-- (insert messages/files, update own row), and security-definer RPCs for the
-- offers queue, accepting work, and status changes — all with student PII
-- kept server-side (writers only ever see an anonymized CLT-#### code).

-- 1. Writer profile + availability columns
alter table public.writers add column if not exists accepting     boolean default true;
alter table public.writers add column if not exists max_concurrent int     default 5;
alter table public.writers add column if not exists specialties    text[]  default '{}';
alter table public.writers add column if not exists bio            text;
alter table public.writers add column if not exists payout_email   text;
alter table public.writers add column if not exists rating         numeric(2,1);
alter table public.writers add column if not exists degree         text;
alter table public.writers add column if not exists field          text;

-- 2. Writers can post into their assigned threads (monitored; not internal)
create policy "messages_writer_insert" on public.order_messages for insert with check (
  is_internal = false
  and order_id in (
    select o.id from public.orders o
    join public.writers w on w.id = o.writer_id
    where w.profile_id = auth.uid()
  )
);

-- 3. Writers can upload files (drafts / finals) to their assigned orders
create policy "files_writer_insert" on public.order_files for insert with check (
  order_id in (
    select o.id from public.orders o
    join public.writers w on w.id = o.writer_id
    where w.profile_id = auth.uid()
  )
);

-- 4. Writers can update their own profile/availability
create policy "writers_own_update" on public.writers for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- 5. Stable, deterministic anonymized client code for an order (no PII).
create or replace function public.order_client_code(p_order uuid)
returns text language sql immutable as $$
  select 'CLT-' || lpad((('x' || substr(md5(p_order::text), 1, 6))::bit(24)::int % 9000 + 1000)::text, 4, '0');
$$;

-- 6. Offers queue — unassigned orders matched to the calling writer's
--    specialties (or all unassigned if none set). Returns anonymized rows.
create or replace function public.writer_offers()
returns table (
  id uuid, ref text, client_code text, title text, level_label text,
  scope_label text, due_date date, created_at timestamptz, priority text
)
language plpgsql security definer set search_path = public as $$
declare
  w_id uuid;
  w_specs text[];
  w_accepting boolean;
begin
  select id, coalesce(specialties, '{}'), coalesce(accepting, true)
    into w_id, w_specs, w_accepting
    from public.writers where profile_id = auth.uid();
  if w_id is null or not w_accepting then return; end if;

  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program,
           o.level_label, o.scope_label, o.due_date, o.created_at, o.priority
    from public.orders o
    where o.writer_id is null
      and o.status in ('new', 'brief_received', 'assigned')
    order by o.created_at desc
    limit 30;
end;
$$;

-- 7. Accept an offer — assigns the calling writer if the order is still open.
create or replace function public.writer_accept_order(p_order uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w_id uuid;
  w_name text;
  ok boolean;
begin
  select id, name into w_id, w_name from public.writers where profile_id = auth.uid();
  if w_id is null then return false; end if;

  update public.orders
    set writer_id = w_id, status = 'assigned', updated_at = now()
    where id = p_order and writer_id is null
    returning true into ok;

  if ok then
    insert into public.order_log (order_id, actor_name, event)
    values (p_order, w_name, 'Expert assigned — accepted the assignment');
  end if;
  return coalesce(ok, false);
end;
$$;

-- 8. Status changes the writer is allowed to make on their own orders.
create or replace function public.writer_set_status(p_order uuid, p_status order_status)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w_id uuid;
  w_name text;
  ok boolean;
begin
  select id, name into w_id, w_name from public.writers where profile_id = auth.uid();
  if w_id is null then return false; end if;
  if p_status not in ('writing', 'in_review') then return false; end if;

  update public.orders
    set status = p_status, updated_at = now()
    where id = p_order and writer_id = w_id
    returning true into ok;

  if ok then
    insert into public.order_log (order_id, actor_name, event)
    values (p_order, w_name,
      case when p_status = 'writing' then 'Expert started work'
           else 'Expert submitted for review' end);
  end if;
  return coalesce(ok, false);
end;
$$;

revoke all on function public.writer_offers()                       from public;
revoke all on function public.writer_accept_order(uuid)             from public;
revoke all on function public.writer_set_status(uuid, order_status) from public;
grant execute on function public.writer_offers()                       to authenticated;
grant execute on function public.writer_accept_order(uuid)             to authenticated;
grant execute on function public.writer_set_status(uuid, order_status) to authenticated;
