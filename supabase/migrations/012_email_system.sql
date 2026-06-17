-- ─── TRANSACTIONAL EMAIL SYSTEM ──────────────────────────────────────────────
-- Implements the email layer from design_handoff_emails/EMAIL-WIRING.md, adapted
-- to this stack. Email is NEVER sent from the browser: a DB event fires a
-- security-definer trigger → net.http_post → the `send-email` Edge Function →
-- Resend (server-held key). The Admin "Emails" console only flips per-event
-- enable flags and triggers test sends.
--
-- Stack adaptations from the spec's assumptions:
--   • No `assignment_offers` table — offers are computed via writer_offers() RPC.
--     `assignment_offer` therefore fires to the assigned expert when orders.writer_id
--     is set (same event that sends the student `expert_assigned`).
--   • No `writer_payouts` table existed — created here so `payout` has a trigger source.
--   • Brief / writer-application intake captures WhatsApp, not email. A nullable
--     `email` column is added to both; the student/expert copy only sends when an
--     email is present. `new_brief_alert` (internal) always fires.
--   • `quote_ready` fires when orders.quote_total transitions to non-null (columns
--     added below) — ready for an admin "publish quote" flow.

create extension if not exists pg_net;

-- ─── PER-EVENT ENABLE FLAGS (drives the console toggles) ──────────────────────
create table if not exists public.email_settings (
  event_id    text primary key,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users
);

-- ─── MASTER SWITCH + PROVIDER STATUS ──────────────────────────────────────────
create table if not exists public.email_config (
  id               int primary key default 1,
  sending_on       boolean not null default true,
  provider_verified boolean not null default false,  -- cached Resend domain status
  from_domain      text not null default 'primemeridian.academy',
  check (id = 1)
);

-- ─── SEND LOG (idempotency + console stats + deliverability) ──────────────────
create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,
  to_addr      text not null,
  subject      text,
  order_id     uuid references public.orders(id) on delete set null,
  provider_id  text,
  status       text not null default 'queued',   -- queued|sent|delivered|bounced|failed
  dedupe_key   text unique,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists email_log_event_idx on public.email_log(event_id, created_at desc);

-- ─── WRITER PAYOUTS (new — trigger source for the `payout` email) ─────────────
create table if not exists public.writer_payouts (
  id          uuid primary key default gen_random_uuid(),
  writer_id   uuid references public.writers(id) on delete set null,
  amount      numeric(10,2) not null,
  period      text,
  method      text,
  created_at  timestamptz not null default now()
);

-- ─── COLUMN ADDITIONS ─────────────────────────────────────────────────────────
alter table public.orders               add column if not exists quote_total   numeric(10,2);
alter table public.orders               add column if not exists quote_deposit numeric(10,2);
alter table public.briefs                add column if not exists email text;
alter table public.writer_applications   add column if not exists email text;
alter table public.profiles              add column if not exists email_prefs jsonb default '{"marketing":true}'::jsonb;

-- ─── SEED ──────────────────────────────────────────────────────────────────────
insert into public.email_config (id, sending_on) values (1, true)
  on conflict (id) do nothing;

insert into public.email_settings (event_id, enabled) values
  ('magiclink', true), ('brief_received', true), ('quote_ready', true),
  ('expert_assigned', true), ('delivered', true), ('application_received', true),
  ('assignment_offer', true), ('payout', true), ('new_brief_alert', true)
  on conflict (event_id) do nothing;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.email_settings enable row level security;
alter table public.email_config   enable row level security;
alter table public.email_log      enable row level security;
alter table public.writer_payouts enable row level security;

-- admin read+write on settings/config; email_log + payouts admin-read (writes via
-- the Edge Function / app, which use the service role and bypass RLS).
create policy "email_settings_admin" on public.email_settings for all
  using   (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "email_config_admin" on public.email_config for all
  using   (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "email_log_admin_read" on public.email_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "writer_payouts_admin" on public.writer_payouts for all
  using   (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ─── NOTIFY HELPER ─────────────────────────────────────────────────────────────
-- The edge URL is non-secret and hardcoded. The service-role bearer (needed to
-- call the JWT-verified function) is read from Supabase Vault — managed Postgres
-- forbids `alter database … set app.*`, so Vault is the supported mechanism.
-- An operator sets it ONCE (handling their own key):
--   select vault.create_secret('<service_role_key>', 'edge_service_key');
-- Until that secret exists, v_key is null and the POST simply fails auth — caught
-- here so the underlying INSERT/UPDATE is never rolled back.
create or replace function public._send_email(p_event text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text := 'https://nwgwlznqghwgvhgbwtpr.supabase.co/functions/v1/send-email';
  v_key text;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'edge_service_key' limit 1;
  exception when others then v_key := null;
  end;
  begin
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || coalesce(v_key, '')),
      body    := jsonb_build_object('event_id', p_event, 'data', p_data)
    );
  exception when others then
    null;  -- email delivery must never roll back the core transaction
  end;
end; $$;

-- ─── TRIGGERS ──────────────────────────────────────────────────────────────────

-- briefs INSERT → new_brief_alert (internal, always) + brief_received (if email)
create or replace function public.notify_brief_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  v_ref text := coalesce(nullif(new.title, ''), 'BRIEF-' || upper(left(new.id::text, 6)));
begin
  perform public._send_email('new_brief_alert', jsonb_build_object(
    'ref', v_ref, 'client', new.name, 'discipline', new.discipline,
    'scope', new.scope, 'deadline', new.deadline, 'admin_url', v_app || '/admin'));

  if new.email is not null and new.email <> '' then
    perform public._send_email('brief_received', jsonb_build_object(
      'to', new.email, 'first_name', split_part(coalesce(new.name, ''), ' ', 1),
      'ref', v_ref, 'discipline', new.discipline, 'scope', new.scope,
      'pages', new.pages, 'portal_url', v_app || '/workspace'));
  end if;
  return new;
end; $$;
drop trigger if exists trg_brief_received on public.briefs;
create trigger trg_brief_received after insert on public.briefs
  for each row execute function public.notify_brief_received();

-- orders.writer_id set → expert_assigned (student) + assignment_offer (expert, anon)
create or replace function public.notify_order_assigned()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  w     record;
begin
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
drop trigger if exists trg_order_assigned on public.orders;
create trigger trg_order_assigned after update of writer_id on public.orders
  for each row when (old.writer_id is distinct from new.writer_id and new.writer_id is not null)
  execute function public.notify_order_assigned();

-- orders.quote_total set → quote_ready
create or replace function public.notify_quote_ready()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
begin
  if new.client_email is not null and new.client_email <> '' then
    perform public._send_email('quote_ready', jsonb_build_object(
      'to', new.client_email, 'order_id', new.id,
      'first_name', split_part(coalesce(new.client_name, ''), ' ', 1),
      'ref', new.ref, 'total', new.quote_total,
      'deposit', coalesce(new.quote_deposit, round(new.quote_total / 2, 2)),
      'due_date', new.due_date, 'pay_url', v_app || '/workspace'));
  end if;
  return new;
end; $$;
drop trigger if exists trg_quote_ready on public.orders;
create trigger trg_quote_ready after update of quote_total on public.orders
  for each row when (old.quote_total is distinct from new.quote_total and new.quote_total is not null)
  execute function public.notify_quote_ready();

-- orders.status = delivered → delivered
create or replace function public.notify_order_delivered()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
begin
  if new.client_email is not null and new.client_email <> '' then
    perform public._send_email('delivered', jsonb_build_object(
      'to', new.client_email, 'order_id', new.id,
      'first_name', split_part(coalesce(new.client_name, ''), ' ', 1),
      'ref', new.ref,
      'files_count', (select count(*) from public.order_files
                        where order_id = new.id and kind in ('final', 'draft', 'revision')),
      'balance', coalesce(new.quote_total, 0) - coalesce(new.quote_deposit, 0),
      'review_url', v_app || '/workspace'));
  end if;
  return new;
end; $$;
drop trigger if exists trg_order_delivered on public.orders;
create trigger trg_order_delivered after update of status on public.orders
  for each row when (old.status is distinct from new.status and new.status = 'delivered')
  execute function public.notify_order_delivered();

-- writer_applications INSERT → application_received (if email)
create or replace function public.notify_application_received()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and new.email <> '' then
    perform public._send_email('application_received', jsonb_build_object(
      'to', new.email, 'name', new.name,
      'field', coalesce(nullif(new.specialty, ''), new.degree)));
  end if;
  return new;
end; $$;
drop trigger if exists trg_application_received on public.writer_applications;
create trigger trg_application_received after insert on public.writer_applications
  for each row execute function public.notify_application_received();

-- writer_payouts INSERT → payout
create or replace function public.notify_payout()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(current_setting('app.url', true), 'https://primemeridian.academy');
  w     record;
begin
  select name, coalesce(payout_email, email) as email
    into w from public.writers where id = new.writer_id;
  if w.email is not null and w.email <> '' then
    perform public._send_email('payout', jsonb_build_object(
      'to', w.email, 'payout_id', new.id, 'expert_name', w.name,
      'amount', new.amount, 'period', new.period, 'method', new.method));
  end if;
  return new;
end; $$;
drop trigger if exists trg_payout on public.writer_payouts;
create trigger trg_payout after insert on public.writer_payouts
  for each row execute function public.notify_payout();
