-- ─── FIX: ambiguous "id" in the offers/invitations feeds ─────────────────────
-- writer_offers() (since migration 010) and writer_invitations() (021) both
-- declare a RETURNS TABLE column named `id`, then do `select id ... into w_id
-- from public.writers`. Postgres can't tell whether that `id` is the OUT-param
-- or writers.id and raises 42702 ("column reference \"id\" is ambiguous") at
-- runtime — so BOTH feeds error out and return nothing. Qualifying the table
-- column (writers w → w.id) resolves it. No behaviour change beyond "now works".

create or replace function public.writer_offers()
returns table (id uuid, ref text, client_code text, title text, level_label text, scope_label text, due_date date, created_at timestamptz, priority text)
language plpgsql security definer set search_path = public as $$
declare w_id uuid; w_specs text[]; w_accepting boolean;
begin
  select w.id, coalesce(w.specialties, '{}'), coalesce(w.accepting, true)
    into w_id, w_specs, w_accepting
    from public.writers w where w.profile_id = auth.uid();
  if w_id is null or not w_accepting then return; end if;
  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program, o.level_label, o.scope_label, o.due_date, o.created_at, o.priority
    from public.orders o
    where o.writer_id is null
      and o.status in ('new', 'brief_received', 'assigned')
      and (o.invitation_status is distinct from 'pending')
    order by o.created_at desc limit 30;
end; $$;

create or replace function public.writer_invitations()
returns table (
  id uuid, ref text, client_code text, title text, level_label text,
  scope_label text, due_date date, created_at timestamptz, priority text,
  rate_writing numeric, rate_project numeric
)
language plpgsql security definer set search_path = public as $$
declare w_id uuid;
begin
  select w.id into w_id from public.writers w where w.profile_id = auth.uid();
  if w_id is null then return; end if;
  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program, o.level_label,
           o.scope_label, o.due_date, o.created_at, o.priority,
           o.rate_writing, o.rate_project
    from public.orders o
    where o.invited_writer_id = w_id
      and o.invitation_status = 'pending'
      and o.writer_id is null
    order by o.created_at desc;
end; $$;
