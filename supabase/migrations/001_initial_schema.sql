-- ─── ENUMS ───────────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'client', 'writer');

create type order_status as enum (
  'new',
  'brief_received',
  'assigned',
  'writing',
  'in_review',
  'delivered',
  'revision',
  'closed'
);

create type payment_status as enum ('unpaid', 'deposit_paid', 'paid_in_full');

create type file_kind as enum ('brief', 'rubric', 'draft', 'final', 'revision', 'other');

create type access_method as enum ('portal', 'device');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'client',
  name        text,
  phone       text,
  email       text,
  school      text,
  program     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── WRITERS ──────────────────────────────────────────────────────────────────
create table public.writers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete set null,
  name        text not null,
  email       text not null unique,
  specialty   text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,        -- e.g. MS-84729
  client_id      uuid references public.profiles(id) on delete set null,
  writer_id      uuid references public.writers(id) on delete set null,

  -- Academic context
  level          text not null,               -- undergrad | graduate | masters_adv | dnp | phd
  level_label    text not null,               -- "DNP"
  program        text not null,               -- "Capella University — DNP Flex Path"
  scope_id       text not null,               -- "full_program"
  scope_label    text not null,               -- "Entire program"
  has_project    boolean default false,
  is_bundle      boolean default false,

  -- Rates (locked at time of order)
  rate_writing   numeric(8,2),
  rate_project   numeric(8,2),

  -- Logistics
  due_date       date,
  access_method  access_method default 'portal',
  payment_method text,
  notes          text,

  -- Status
  status         order_status default 'new',
  payment_status payment_status default 'unpaid',
  priority       text default 'normal',       -- normal | high | urgent

  -- Client contact (captured at order time, before auth)
  client_name    text,
  client_phone   text,
  client_email   text,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─── ORDER FILES ──────────────────────────────────────────────────────────────
create table public.order_files (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name   text not null,
  file_path   text not null,           -- Supabase Storage path
  file_url    text,                    -- Public or signed URL
  kind        file_kind default 'other',
  size_bytes  bigint,
  created_at  timestamptz default now()
);

-- ─── ORDER MESSAGES ───────────────────────────────────────────────────────────
create table public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_name text,                    -- fallback if profile deleted
  body        text not null,
  is_internal boolean default false,   -- admin-only notes
  created_at  timestamptz default now()
);

-- ─── ORDER LOG ────────────────────────────────────────────────────────────────
create table public.order_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text,
  event       text not null,           -- "Status changed to Writing"
  created_at  timestamptz default now()
);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  amount       numeric(10,2) not null,
  type         text not null,          -- 'deposit' | 'balance'
  method       text,                   -- M-Pesa | Sendwave etc
  reference    text,                   -- M-Pesa transaction code etc
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at   timestamptz default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index on public.orders(client_id);
create index on public.orders(writer_id);
create index on public.orders(status);
create index on public.orders(created_at desc);
create index on public.order_files(order_id);
create index on public.order_messages(order_id);
create index on public.order_log(order_id);
create index on public.payments(order_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── ORDER REF GENERATOR ─────────────────────────────────────────────────────
create or replace function public.generate_order_ref()
returns text language plpgsql as $$
declare
  ref text;
  exists boolean;
begin
  loop
    ref := 'MS-' || lpad(floor(random() * 99999)::text, 5, '0');
    select count(*) > 0 into exists from public.orders where orders.ref = ref;
    exit when not exists;
  end loop;
  return ref;
end;
$$;
