-- 031_orders_intake_fields.sql — the structured intake fields live on `briefs`
-- but NOT on `orders`. The expert workspace (FactsStrip, brief checklist, and the
-- pages×$2.32 pay) reads them off the order, so add them to orders and backfill
-- what we can. New orders populate these at creation (client BriefFlow + admin
-- convert, already wired). 030 added `title`; this adds the rest.
alter table public.orders
  add column if not exists discipline   text,
  add column if not exists pages        int,
  add column if not exists citation     text,
  add column if not exists requirements text;

-- Backfill discipline from program (the client brief stores discipline as program).
update public.orders set discipline = program
  where discipline is null and program is not null;

-- Backfill requirements from the legacy "Requirements: …" line in the notes blob.
update public.orders set requirements = btrim((regexp_match(notes, 'Requirements:\s*(.+)'))[1])
  where requirements is null and notes ~ 'Requirements:\s*.+';
