-- 035_expert_performance.sql — track the expert performance metrics the new
-- dashboard surfaces. rating/delivered/on-time/streak are computed from existing
-- data; acceptance % and rework % aren't recorded anywhere today, so we add
-- durable counters that accumulate going forward (start at 0, never fabricated).
-- Also opens order_log to the assigned expert so the activity feed can load.

-- ── 1) forward-looking counters on writers ──────────────────────────────────
alter table public.writers add column if not exists invites_offered    integer not null default 0;
alter table public.writers add column if not exists invites_accepted   integer not null default 0;
alter table public.writers add column if not exists revisions_received integer not null default 0;

-- ── 2) acceptance: count invites offered (on invite) + accepted (on confirm) ─
-- Extend notify_order_invited (021) to also bump invites_offered for the invitee.
create or replace function public.notify_order_invited()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  w record;
begin
  update public.writers set invites_offered = invites_offered + 1 where id = new.invited_writer_id;
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

-- Extend writer_respond_invitation (021) — bump invites_accepted on accept.
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

  select * into o from public.orders
    where id = p_order
      and invited_writer_id = w_id
      and invitation_status = 'pending'
      and writer_id is null
    for update;
  if not found then return false; end if;

  if p_accept then
    update public.writers set invites_accepted = invites_accepted + 1 where id = w_id;
    update public.orders
      set writer_id = w_id, status = 'assigned', invitation_status = 'confirmed', updated_at = now()
      where id = p_order;
    insert into public.order_log (order_id, actor_id, actor_name, event)
      values (p_order, auth.uid(), w_name, 'Expert confirmed the assignment — work has begun');
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
    select email into v_admin_email from public.profiles
      where role = 'admin' and email is not null order by created_at limit 1;
    perform public._send_email('assignment_rejected', jsonb_build_object(
      'to', v_admin_email, 'order_id', o.id, 'ref', o.ref, 'expert_name', w_name,
      'program', o.program, 'level', o.level_label, 'due_date', o.due_date,
      'admin_url', v_app || '/admin'));
  end if;
  return true;
end; $$;

-- ── 3) rework: count revisions sent back to the assigned expert ──────────────
create or replace function public.bump_writer_revisions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'revision' and old.status is distinct from 'revision' and new.writer_id is not null then
    update public.writers set revisions_received = revisions_received + 1 where id = new.writer_id;
  end if;
  return new;
end; $$;
drop trigger if exists trg_bump_writer_revisions on public.orders;
create trigger trg_bump_writer_revisions after update of status on public.orders
  for each row execute function public.bump_writer_revisions();

-- ── 4) performance summary for the calling expert ───────────────────────────
create or replace function public.writer_performance()
returns table (rating numeric, delivered integer, ontime integer, ontime_pct integer,
               streak integer, acceptance_pct integer, rework_pct integer)
language plpgsql security definer set search_path = public as $$
declare
  w           public.writers%rowtype;
  v_delivered int;
  v_with_due  int;
  v_ontime    int;
  v_streak    int := 0;
  r           record;
begin
  select * into w from public.writers where profile_id = auth.uid();
  if not found then return; end if;

  select
    count(*) filter (where status in ('delivered','closed')),
    count(*) filter (where status in ('delivered','closed') and due_date is not null),
    count(*) filter (where status in ('delivered','closed') and due_date is not null and updated_at::date <= due_date)
  into v_delivered, v_with_due, v_ontime
  from public.orders where writer_id = w.id;

  -- on-time streak: leading run of on-time deliveries, most-recent first
  for r in
    select (updated_at::date <= due_date) as on_time
    from public.orders
    where writer_id = w.id and status in ('delivered','closed') and due_date is not null
    order by updated_at desc
  loop
    exit when not r.on_time;
    v_streak := v_streak + 1;
  end loop;

  return query select
    w.rating,
    v_delivered,
    v_ontime,
    case when v_with_due > 0 then round(100.0 * v_ontime / v_with_due)::int else null end,
    v_streak,
    case when w.invites_offered > 0 then round(100.0 * w.invites_accepted / w.invites_offered)::int else null end,
    case when v_delivered > 0 then round(100.0 * w.revisions_received / v_delivered)::int else null end;
end; $$;
revoke all on function public.writer_performance() from public;
grant execute on function public.writer_performance() to authenticated;

-- ── 5) let the assigned expert read their orders' activity log ───────────────
drop policy if exists "log_writer_read" on public.order_log;
create policy "log_writer_read" on public.order_log for select using (
  order_id in (
    select o.id from public.orders o
    join public.writers w on w.id = o.writer_id
    where w.profile_id = auth.uid()
  )
);
