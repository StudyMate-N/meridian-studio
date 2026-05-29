-- Migration 008: Writer applications (expression of interest form)
-- Public can insert; admin can read and manage all.

create table public.writer_applications (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text not null,
  degree      text not null,
  specialty   text,
  status      text default 'pending',
  created_at  timestamptz default now()
);

alter table public.writer_applications enable row level security;

-- Anyone (including unauthenticated visitors) can submit an application
create policy "writer_apps_public_insert" on public.writer_applications
  for insert with check (true);

-- Admin can read and manage all applications
create policy "writer_apps_admin_all" on public.writer_applications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
