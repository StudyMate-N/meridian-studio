-- 030_orders_title.sql — give orders a real `title` (the assignment topic).
-- Until now the topic + requirements were only stuffed into the `notes` blob, so
-- the expert FactsStrip/title and the pages×$2.32 pay had nothing structured to
-- read. New orders populate title/pages/citation/requirements at creation
-- (client BriefFlow + admin convert); this adds the column and backfills the
-- title from the existing notes blob where possible.
alter table public.orders add column if not exists title text;

-- Backfill: pull "Title: …" out of the notes blob for existing orders.
update public.orders
  set title = btrim((regexp_match(notes, 'Title:\s*(.+)'))[1])
  where title is null and notes ~ 'Title:\s*.+';
