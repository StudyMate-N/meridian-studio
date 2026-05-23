-- ─── SETTINGS TABLE ──────────────────────────────────────────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);

-- ─── SEED DEFAULT RATES ───────────────────────────────────────────────────────
insert into public.settings (key, value) values
  ('rates', '{
    "undergrad":   { "rW": 12, "rP": null },
    "graduate":    { "rW": 18, "rP": null },
    "masters_adv": { "rW": 20, "rP": 25   },
    "dnp":         { "rW": 25, "rP": 30   },
    "phd":         { "rW": 28, "rP": 35   }
  }'::jsonb)
on conflict (key) do nothing;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.settings enable row level security;

-- Admin can read and write settings
create policy "settings_admin_all" on public.settings
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
