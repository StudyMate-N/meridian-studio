create table public.briefs (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  discipline   text,
  level        text,
  scope        text,
  pages        int,
  citation     text,
  deadline     text,
  requirements text,
  estimate_usd int,
  wants_call   bool default false,
  name         text,
  whatsapp     text,
  notes        text,
  rubric_text  text,
  status       text default 'new',
  created_at   timestamptz default now()
);

alter table public.briefs enable row level security;

create policy "briefs_public_insert" on public.briefs
  for insert with check (true);

create policy "briefs_admin_all" on public.briefs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
