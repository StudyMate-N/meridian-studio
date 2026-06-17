-- 019_support_system.sql
-- Live support: a client/expert can message the team and an admin manages a queue
-- (the "Support Console"). Mirrors the order_messages pattern but for support.
--
--   support_conversations  — one open thread per requester
--   support_messages       — the messages (role: user | admin | ai | system)
--
-- Status flow: waiting (needs a human) → human (admin owns it) → closed.
-- 'ai' is reserved for AI-handled threads (hand-back).

create table if not exists public.support_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  name            text,
  email           text,
  surface         text not null default 'client',   -- client | writer | marketing
  order_ref       text,
  subject         text,
  status          text not null default 'waiting',   -- waiting | human | ai | closed
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create table if not exists public.support_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  role            text not null default 'user',      -- user | admin | ai | system
  sender_name     text,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_support_msg_convo on public.support_messages(conversation_id, created_at);
create index if not exists idx_support_conv_user on public.support_conversations(user_id);
create index if not exists idx_support_conv_status on public.support_conversations(status, last_message_at desc);

alter table public.support_conversations enable row level security;
alter table public.support_messages      enable row level security;

-- ── conversations RLS ───────────────────────────────────────────────────────
drop policy if exists "support_conv_owner"  on public.support_conversations;
create policy "support_conv_owner" on public.support_conversations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "support_conv_admin" on public.support_conversations;
create policy "support_conv_admin" on public.support_conversations
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ── messages RLS ────────────────────────────────────────────────────────────
drop policy if exists "support_msg_read" on public.support_messages;
create policy "support_msg_read" on public.support_messages
  for select to authenticated
  using (
    public.get_user_role() = 'admin'
    or conversation_id in (select id from public.support_conversations where user_id = auth.uid())
  );

drop policy if exists "support_msg_owner_insert" on public.support_messages;
create policy "support_msg_owner_insert" on public.support_messages
  for insert to authenticated
  with check (
    role = 'user'
    and conversation_id in (select id from public.support_conversations where user_id = auth.uid())
  );

drop policy if exists "support_msg_admin_all" on public.support_messages;
create policy "support_msg_admin_all" on public.support_messages
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ── keep the conversation's last_message_at + status in sync ────────────────
create or replace function public.bump_support_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.support_conversations
    set last_message_at = now(),
        status = case
                   when new.role = 'admin' then 'human'
                   when new.role = 'user' and status = 'human' then 'human'
                   when new.role = 'user' then 'waiting'
                   else status
                 end
    where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_bump_support_conversation on public.support_messages;
create trigger trg_bump_support_conversation
  after insert on public.support_messages
  for each row execute function public.bump_support_conversation();

-- ── realtime ────────────────────────────────────────────────────────────────
alter table public.support_conversations replica identity full;
alter table public.support_messages      replica identity full;
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.support_conversations'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.support_messages'; exception when duplicate_object then null; end;
end $$;
