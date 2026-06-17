-- ============================================================================
-- ⚠️  DESTRUCTIVE — ONE-OFF TEST-DATA RESET. NOT a migration; do not commit-run.
-- Removes ALL orders + ALL non-admin users (clients & experts) and their data.
-- PRESERVES admin account(s) — every profile with role = 'admin'.
-- IRREVERSIBLE. Take a backup first (Supabase → Database → Backups) if unsure.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run.
-- (Runs as the privileged DB role, so it can delete from auth.users.)
-- ============================================================================

-- Sanity check BEFORE you run the deletes — confirm what will be kept/removed:
--   select role, count(*) from public.profiles group by role;   -- expect 1+ admin
--   select count(*) from public.orders;                          -- test orders
--   select count(*) from auth.users;                             -- total accounts

begin;

-- 1) Orders + everything that hangs off them.
delete from public.order_messages;
delete from public.order_files;
delete from public.order_log;
delete from public.order_parts;
delete from public.payments;
delete from public.payment_links;
delete from public.invoices;
delete from public.orders;

-- 2) Intake + ops test artifacts.
delete from public.briefs;
delete from public.support_messages;
delete from public.support_conversations;
delete from public.writer_applications;

-- 3) All experts.
delete from public.writers;

-- 4) Every NON-admin account — removes the auth login AND cascades the profile
--    (profiles.id references auth.users on delete cascade).
delete from auth.users
where id not in (select id from public.profiles where role = 'admin');

-- Review the row counts the editor reports, then:
commit;        -- or:  rollback;  to abort with no changes

-- After commit, confirm:
--   select role, count(*) from public.profiles group by role;   -- only admin(s)
--   select count(*) from public.orders;                          -- 0
