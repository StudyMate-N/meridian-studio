-- ─── ORDER ↔ EXPERT INVITATION WORKFLOW ──────────────────────────────────────
-- The admin invites an expert to an order directly from the portal. The expert
-- gets an invitation and either CONFIRMS or DECLINES:
--   • Confirm  → order is assigned to that expert and the CLIENT is emailed that
--                work has begun ('work_started').
--   • Decline  → the invitation is cleared and only the ADMIN is alerted silently
--                ('assignment_rejected') so they can reassign. The client sees
--                nothing.
-- An invited order is held out of the open self-serve offers pool until it is
-- either confirmed or declined, so two experts can't grab the same brief.
--
-- This migration adds two columns, the email events (via triggers + an RPC), an
-- anonymized invitation feed for the expert, the expert respond RPC, and teaches
-- the legacy assign trigger to stand down for confirmed invitations.

-- ─── 1) COLUMNS ──────────────────────────────────────────────────────────────
alter table public.orders add column if not exists invited_writer_id uuid references public.writers(id) on delete set null;
alter table public.orders add column if not exists invitation_status text;   -- null | pending | confirmed | rejected
create index if not exists idx_orders_invited_writer on public.orders(invited_writer_id);

-- ─── 2) ANONYMIZED INVITATION FEED (expert side) ─────────────────────────────
-- Mirrors writer_offers(): SECURITY DEFINER, never exposes client PII — only the
-- CLT-#### code. Returns the orders this expert has a PENDING invitation to.
create or replace function public.writer_invitations()
returns table (
  id uuid, ref text, client_code text, title text, level_label text,
  scope_label text, due_date date, created_at timestamptz, priority text,
  rate_writing numeric, rate_project numeric
)
language plpgsql security definer set search_path = public as $$
declare w_id uuid;
begin
  select id into w_id from public.writers where profile_id = auth.uid();
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

revoke all on function public.writer_invitations() from public;
grant execute on function public.writer_invitations() to authenticated;

-- ─── 3) EXPERT RESPONDS (confirm / decline) ──────────────────────────────────
create or replace function public.writer_respond_invitation(p_order uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w_id uuid; w_name text;
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  v_admin_email text;
  o record;
begin
  select id, name into w_id, w_name from public.writers where profile_id = auth.uid();
  if w_id is null then return false; end if;

  -- The caller must be the pending invitee on an order that isn't already assigned.
  select * into o from public.orders
    where id = p_order
      and invited_writer_id = w_id
      and invitation_status = 'pending'
      and writer_id is null
    for update;
  if not found then return false; end if;

  if p_accept then
    update public.orders
      set writer_id = w_id, status = 'assigned', invitation_status = 'confirmed', updated_at = now()
      where id = p_order;
    insert into public.order_log (order_id, actor_id, actor_name, event)
      values (p_order, auth.uid(), w_name, 'Expert confirmed the assignment — work has begun');
    -- Tell the client work has begun (their own order; expert name is fine to show).
    if o.client_email is not null and o.client_email <> '' then
      perform public._send_email('work_started', jsonb_build_object(
        'to', o.client_email, 'order_id', o.id,
        'first_name', split_part(coalesce(o.client_name, ''), ' ', 1),
        'expert_name', w_name, 'ref', o.ref,
        'thread_url', v_app || '/workspace'));
    end if;
  else
    update public.orders
      set invited_writer_id = null, invitation_status = 'rejected', updated_at = now()
      where id = p_order;
    insert into public.order_log (order_id, actor_id, actor_name, event)
      values (p_order, auth.uid(), w_name, 'Expert declined the invitation');
    -- Silent admin-only alert so they can reassign. The client is never told.
    select email into v_admin_email from public.profiles
      where role = 'admin' and email is not null order by created_at limit 1;
    perform public._send_email('assignment_rejected', jsonb_build_object(
      'to', v_admin_email, 'order_id', o.id, 'ref', o.ref, 'expert_name', w_name,
      'program', o.program, 'level', o.level_label, 'due_date', o.due_date,
      'admin_url', v_app || '/admin'));
  end if;
  return true;
end; $$;

revoke all on function public.writer_respond_invitation(uuid, boolean) from public;
grant execute on function public.writer_respond_invitation(uuid, boolean) to authenticated;

-- ─── 4) ADMIN INVITES → email the expert (trigger, reliable server-side) ──────
create or replace function public.notify_order_invited()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  w record;
begin
  select name, email, coalesce(field, specialty) as field
    into w from public.writers where id = new.invited_writer_id;
  if w.email is not null and w.email <> '' then
    perform public._send_email('expert_invitation', jsonb_build_object(
      'to', w.email, 'expert_name', w.name,
      'client_code', public.order_client_code(new.id),
      'discipline', new.program, 'level', new.level_label,
      'deadline', new.due_date,
      'pay', coalesce(new.rate_project, new.rate_writing),
      'accept_url', v_app || '/expert'));
  end if;
  return new;
end; $$;
drop trigger if exists trg_order_invited on public.orders;
create trigger trg_order_invited after update of invited_writer_id on public.orders
  for each row when (
    new.invited_writer_id is not null
    and new.invitation_status = 'pending'
    and old.invited_writer_id is distinct from new.invited_writer_id
  )
  execute function public.notify_order_invited();

-- ─── 5) LEGACY ASSIGN TRIGGER stands down for confirmed invitations ──────────
-- When an assignment arrives via a confirmed invitation we already send the
-- client a 'work_started' email (and the expert already accepted), so the legacy
-- 'expert_assigned'/'assignment_offer' pair must NOT also fire. Direct admin
-- assignment (invitation_status null) keeps the original behaviour.
create or replace function public.notify_order_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  w     record;
begin
  if new.invitation_status = 'confirmed' then
    return new;   -- invitation flow handles its own client email
  end if;

  select name, email, coalesce(field, specialty) as field
    into w from public.writers where id = new.writer_id;

  if new.client_email is not null and new.client_email <> '' then
    perform public._send_email('expert_assigned', jsonb_build_object(
      'to', new.client_email, 'order_id', new.id,
      'first_name', split_part(coalesce(new.client_name, ''), ' ', 1),
      'expert_name', w.name, 'expert_field', w.field,
      'ref', new.ref, 'thread_url', v_app || '/workspace'));
  end if;

  if w.email is not null and w.email <> '' then
    perform public._send_email('assignment_offer', jsonb_build_object(
      'to', w.email, 'expert_name', w.name,
      'client_code', public.order_client_code(new.id),
      'discipline', new.program, 'level', new.level_label,
      'deadline', new.due_date, 'pay', coalesce(new.rate_project, new.rate_writing),
      'accept_url', v_app || '/expert'));
  end if;
  return new;
end; $$;

-- ─── 6) OPEN OFFERS / SELF-CLAIM hold out pending-invited orders ─────────────
create or replace function public.writer_offers()
returns table (id uuid, ref text, client_code text, title text, level_label text, scope_label text, due_date date, created_at timestamptz, priority text)
language plpgsql security definer set search_path = public as $$
declare w_id uuid; w_specs text[]; w_accepting boolean;
begin
  select id, coalesce(specialties, '{}'), coalesce(accepting, true)
    into w_id, w_specs, w_accepting from public.writers where profile_id = auth.uid();
  if w_id is null or not w_accepting then return; end if;
  return query
    select o.id, o.ref, public.order_client_code(o.id), o.program, o.level_label, o.scope_label, o.due_date, o.created_at, o.priority
    from public.orders o
    where o.writer_id is null
      and o.status in ('new', 'brief_received', 'assigned')
      and (o.invitation_status is distinct from 'pending')
    order by o.created_at desc limit 30;
end; $$;

create or replace function public.writer_accept_order(p_order uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare w_id uuid; w_name text; ok boolean;
begin
  select id, name into w_id, w_name from public.writers where profile_id = auth.uid();
  if w_id is null then return false; end if;
  update public.orders set writer_id = w_id, status = 'assigned', updated_at = now()
    where id = p_order
      and writer_id is null
      and (invitation_status is distinct from 'pending')   -- can't grab someone else's pending invite
    returning true into ok;
  if ok then
    insert into public.order_log (order_id, actor_name, event)
      values (p_order, w_name, 'Expert assigned — accepted the assignment');
  end if;
  return coalesce(ok, false);
end; $$;

-- ─── 7) EMAIL EVENT TOGGLES (console) ────────────────────────────────────────
insert into public.email_settings (event_id, enabled) values
  ('expert_invitation', true), ('work_started', true), ('assignment_rejected', true)
  on conflict (event_id) do nothing;
