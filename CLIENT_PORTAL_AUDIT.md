# Meridian Studio — Client Portal Audit Report

**Date:** 2026-05-24  
**Scope:** Read-only audit of the current codebase state  
**Purpose:** Inform the client portal build prompt

---

## 1. File Structure

```
Meridian Studio/
├── index.html                          (18 lines)
├── admin.html                          (23 lines)
├── vite.config.js
├── src/
│   ├── main.jsx                         (9 lines)  — React bootstrap
│   ├── App.jsx                         (19 lines)  — Top-level mode switcher
│   ├── CatalogApp.jsx               (1,408 lines)  — All client-facing UI
│   ├── OMSApp.jsx                   (1,866 lines)  — Legacy admin (replaced)
│   ├── lib/
│   │   └── supabase.js                  (5 lines)
│   └── admin/
│       ├── main.jsx                     (8 lines)
│       ├── AdminApp.jsx               (172 lines)
│       ├── AdminLayout.jsx            (213 lines)
│       ├── constants.js                (80 lines)
│       ├── hooks/
│       │   ├── useOrders.js            (57 lines)
│       │   ├── useClients.js           (25 lines)
│       │   └── useWriters.js
│       ├── components/
│       │   ├── OrderDrawer.jsx
│       │   ├── KanbanBoard.jsx
│       │   ├── StatCard.jsx
│       │   └── StatusBadge.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Orders.jsx
│           ├── Clients.jsx
│           ├── Writers.jsx
│           ├── Billing.jsx
│           └── Settings.jsx
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql     (190 lines)
        ├── 002_rls_policies.sql        (75 lines)
        ├── 003_storage.sql             (34 lines)
        ├── 004_settings.sql            (26 lines)
        └── 005_enable_realtime.sql     (13 lines)
```

**Total: ~4,200 lines** (excluding node_modules, dist, .git)

> No `supabase/functions/` directory exists.

---

## 2. Auth — What Exists for Clients

### Top-level routing (`src/App.jsx`)

```js
export default function App() {
  const [mode, setMode] = useState("client");
  return mode === "admin"
    ? <OMSApp    onBack={() => setMode("client")} />
    : <CatalogApp onAdmin={() => setMode("admin")} />;
}
```

State-based mode switching — no URL routing. `/admin` is a separate HTML entry point.

### Client auth state (`CatalogApp.jsx` ~line 1463)

```js
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user || null);
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
    setUser(session?.user || null);
  });
  return () => subscription.unsubscribe();
}, []);
```

### Client sign-in (`WorkspacePage` ~line 835)

```js
async function handleSignIn() {
  const { error } = await supabase.auth.signInWithOtp({
    email: signInEmail.trim(),
    options: { emailRedirectTo: window.location.origin }, // ← redirects to /, not workspace
  });
}
```

| Check | Status |
|---|---|
| Session checked on mount | ✅ |
| OTP magic link sign-in | ✅ Implemented in "My Orders" tab |
| Sign-up flow | ❌ None — OTP creates account implicitly |
| Magic link redirects to workspace | ❌ Redirects to `/` (catalog root) |
| Role check for clients | ❌ Any authenticated user treated as client |
| Post-auth action (order claim / redirect) | ❌ None |

---

## 3. Supabase — Client RLS Policies

Full breakdown from `002_rls_policies.sql` for `role = 'client'`:

### `orders` table

```sql
-- Anyone (including anonymous) can place an order
create policy "orders_public_insert" on public.orders for insert
  with check (true);

-- Clients can ONLY read orders where client_id = their auth.uid()
create policy "orders_client_read" on public.orders for select
  using (client_id = auth.uid());
```

### `order_files` table

```sql
create policy "files_client_read" on public.order_files for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);

create policy "files_client_insert" on public.order_files for insert with check (
  order_id in (select id from public.orders where client_id = auth.uid())
);
```

### `order_messages` table

```sql
create policy "messages_client_read" on public.order_messages for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
  and is_internal = false
);

create policy "messages_client_insert" on public.order_messages for insert with check (
  order_id in (select id from public.orders where client_id = auth.uid())
);
```

### `payments` table

```sql
create policy "payments_client_read" on public.payments for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);
```

### `order_log` table

```sql
create policy "log_client_read" on public.order_log for select using (
  order_id in (select id from public.orders where client_id = auth.uid())
);
```

### Storage (`003_storage.sql`)

```sql
-- Authenticated users can upload
create policy "order_files_client_upload" on storage.objects for insert
  with check (bucket_id = 'order-files' and auth.role() = 'authenticated');

-- Clients can read ONLY from a folder named after their auth.uid()
create policy "order_files_owner_read" on storage.objects for select using (
  bucket_id = 'order-files'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

> **Critical:** Every client RLS policy gates on `client_id = auth.uid()`. Anonymous orders have `client_id = NULL`. A signed-in client sees **zero** of their own orders unless `client_id` was set at submission time.

---

## 4. Order → Client Linkage

### Order submission (`CatalogApp.jsx` ~line 206)

```js
const { data: order } = await supabase
  .from("orders")
  .insert({
    ref,
    level:          level?.id,
    level_label:    level?.label,
    program,
    scope_id:       scope?.id,
    scope_label:    scope?.label,
    due_date:       due || null,
    client_name:    name,
    client_phone:   phone,
    client_email:   email || null,
    status:         "new",
    payment_status: "unpaid",
    // ← client_id is NEVER SET
  })
  .select().single();
```

### `handle_new_user()` trigger (`001_initial_schema.sql` ~line 159)

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Creates a profile on first sign-in. Does **not** look up or link any orders.

### Linkage mechanism inventory

| Mechanism | Exists? |
|---|---|
| Set `client_id` at submission (if already signed in) | ❌ |
| Supabase trigger to claim orders on profile creation | ❌ |
| Frontend code to claim orders after sign-in | ❌ |
| Edge function to match email → orders → update `client_id` | ❌ |
| RPC function `claim_my_orders()` or similar | ❌ |
| Admin tool to manually link orders to a client | ❌ |

The linkage gap is **total**. An order placed with `client_email = jane@example.com` and a profile created by signing in as `jane@example.com` are two completely separate, unconnected records.

---

## 5. Current Workspace Page

**Location:** `WorkspacePage` component inside `CatalogApp.jsx` (~line 808)

**Auth gate:** None — workspace renders for both guests and signed-in users. "My Orders" tab shows a sign-in prompt when `user` is null.

### State

```js
const [nav, setNav]                   = useState("new");
const [sessionOrders, setSessionOrders] = useState([]);  // local, populated after submit
const [dbOrders, setDbOrders]         = useState([]);    // from Supabase (always 0 rows)
const [user, setUser]                 = useState(null);
```

### Navigation tabs (hardcoded)

| Tab ID | Label | Data source | Live? |
|---|---|---|---|
| `new` | New Order | Inserts to Supabase | ✅ Places orders |
| `orders` | My Orders | `orders where client_id = auth.uid()` | ⚠️ Fetches but always returns 0 rows |
| `messages` | Messages | Static WhatsApp link | ❌ Not order-contextual |
| `rates` | Rate Sheet | Hardcoded constants | ❌ Not from `public.settings` |
| `how` | How It Works | Static content | ❌ |

### My Orders fetch (~line 824)

```js
useEffect(() => {
  if (!user) { setDbOrders([]); return; }
  supabase.from("orders")
    .select("*")
    .eq("client_id", user.id)          // ← always returns 0 rows
    .order("created_at", { ascending: false })
    .then(({ data }) => setDbOrders(data || []));
}, [user]);
```

### Post-submit behaviour

Order ref added to `sessionOrders` (component local state). Lost on page refresh with no recovery path.

---

## 6. Database — Client-Relevant Tables

### `profiles` table

```sql
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
```

All columns needed for client self-service exist. `school` and `program` are never collected during OTP sign-up — they remain `NULL` until a profile-edit UI is built.

### `orders` table (client-relevant columns)

```sql
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,
  client_id      uuid references public.profiles(id) on delete set null,  -- nullable FK
  ...
  client_name    text,    -- captured at order time
  client_phone   text,
  client_email   text,
  ...
);

create index on public.orders(client_id);   -- ✅ index exists
```

The FK and index are properly defined. The gap is application-layer only — `client_id` is never written.

### `order_files` table

```sql
create table public.order_files (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name   text not null,
  file_path   text not null,   -- stored as {order.id}/{timestamp}-{filename}
  file_url    text,
  kind        file_kind default 'other',
  size_bytes  bigint,
  created_at  timestamptz default now()
);
```

### `order_messages` table

```sql
create table public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_name text,
  body        text not null,
  is_internal boolean default false,
  created_at  timestamptz default now()
);
```

`is_internal` properly separates admin notes from client-visible messages.

**Missing for client self-service:**
- No `notifications` table
- No `avatar_url` on profiles

---

## 7. File Download — Client Access

### Upload path (order submission ~line 238)

```js
const path = `${order.id}/${Date.now()}-${brief.name}`;
// Stored as: {order-uuid}/{timestamp}-filename.pdf
```

### Storage read policy

```sql
create policy "order_files_owner_read" on storage.objects for select using (
  bucket_id = 'order-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  -- ↑ expects first folder = auth.uid()
  -- ↑ actual first folder  = order.id  ← MISMATCH
);
```

Files are stored under `{order.id}/...` but the policy checks for `{auth.uid()}/...` as the first path segment. A client attempting to download their own brief would be **denied** by storage RLS even if `client_id` were correctly linked. Only admins (via a separate policy) can currently download from storage.

No signed URL generation exists in any client-facing component.

---

## 8. What the Client Currently Experiences

| Step | What actually happens |
|---|---|
| Lands on catalog | Sees level selector, program input, order configurator. No auth required. |
| Places an order | Order inserted to Supabase with `client_id = NULL`. WhatsApp opens with order summary. |
| Clicks "My orders" | Workspace opens. If not signed in, sees email input to request magic link. |
| Requests magic link | OTP email sent. `emailRedirectTo` is `window.location.origin` (the catalog root `/`). |
| Clicks link in email | Lands back on the catalog page — not the workspace. Has to manually re-enter workspace. |
| Opens "My orders" tab | Query runs: `orders where client_id = auth.uid()`. Returns **0 rows**. |
| Can they see their orders? | ❌ No — orders have `client_id = NULL`, invisible after sign-in. |
| Can they download files? | ❌ No — storage path `{order.id}/...` doesn't match RLS policy `{auth.uid()}/...`. |
| Can they message admin? | ❌ No — "Messages" tab is a static WhatsApp link with no order context. |

---

## 9. Gaps Summary

```
WORKING:
- Order submission form (collects all fields, inserts to Supabase, generates ref)
- Brief file upload to storage bucket on order submit
- OTP magic link sign-in flow (email input + supabase.auth.signInWithOtp)
- Admin auth gate (role check, deny screen, 5-second timeout fallback)
- Session persistence (supabase.auth.onAuthStateChange listener)
- WhatsApp order notification with full order details
- Rate sheet display (hardcoded values)
- "How it works" static content

MISSING:
- client_id set on order submission when user is already signed in
- Order claiming: mechanism to UPDATE orders SET client_id = auth.uid()
  WHERE client_email = auth.email() AND client_id IS NULL, triggered after sign-in
- Magic link emailRedirectTo pointing to workspace/my-orders (not catalog root)
- Post-sign-in hook that runs the claim function automatically
- Signed URL generation for client file downloads
- Client-facing order detail view (status, files, messages, log per order)
- Real-time message thread per order (client ↔ admin chat)
- Client profile page (view/edit name, phone, school, program)
- Notifications (new message, status change, file uploaded by admin)
- Storage path fix: must be {auth.uid()}/{order.id}/... to match RLS,
  OR add a separate storage policy that gates on order ownership via orders table
- Rate sheet fetched live from public.settings (currently hardcoded constants)
- Meaningful empty state in "My orders" with guidance for new/unlinked orders

BROKEN:
- My Orders tab always returns 0 rows — client_id is NULL on every order
- File download for clients — storage.foldername policy checks auth.uid() as
  first segment but files are stored under {order.id}/... — always denied
- Magic link redirect — emailRedirectTo sends client back to catalog, losing
  the workspace context; user has to manually re-navigate
- Session orders (local state) are lost on page refresh with no recovery path

CRITICAL PATH:
1. Fix order submission: set client_id = auth.uid() when user is already signed in
2. Create claim_my_orders() Supabase RPC: UPDATE orders SET client_id = auth.uid()
   WHERE client_email = auth.email() AND client_id IS NULL
3. Call claim_my_orders() automatically inside onAuthStateChange on every sign-in
4. Fix magic link emailRedirectTo to point to /?workspace=orders (or equivalent)
5. Fix storage path convention: {auth.uid()}/{order.id}/{filename} so the owner_read
   RLS policy matches — OR rewrite the policy to join through orders table
6. Build client order list: real orders from Supabase with ref, status badge,
   scope, due date, and a row-click to open order detail
7. Build per-order detail view: status timeline, files tab (signed URL download),
   messages tab (real-time chat with admin)
8. Build client profile page: editable name, phone, school, program
```

---

*Report generated from static analysis of source files. No files were modified.*
