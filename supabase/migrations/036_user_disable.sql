-- 036_user_disable.sql — soft-delete (deactivate) support for user accounts.
--
-- Two admin capabilities are built on top of this:
--   • Deactivate (reversible): the delete-user edge function bans the auth user
--     (revokes login) and stamps profiles.disabled_at. Reactivate clears both.
--     Data is fully preserved.
--   • Hard delete (permanent): a separate edge-function path that removes the
--     auth.users row — which cascades the profile (profiles.id references
--     auth.users on delete cascade), cascade-deleting that client's invoices +
--     payment_links and nulling their orders' client_id; for experts the writers
--     row is removed first (orders.writer_id is set null). Guarded: blocked when
--     the user still has active (non-closed) orders or open invoices.
--
-- A banned auth user cannot obtain a session, so login is the real gate — no RLS
-- change is needed. The admin console shows disabled users with a "Deactivated"
-- badge + a Reactivate action.

alter table public.profiles add column if not exists disabled_at timestamptz;
