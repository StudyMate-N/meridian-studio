# Enabling Google Sign-In

The app already ships the "Continue with Google" buttons (sign-in, sign-up,
brief flow, and order flow) and all the wiring. **The only values that can't be
generated automatically are the Google Client ID and Secret** — Google issues
those, tied to your Google account. Everything else is automated below.

---

## Step 1 — Get the two Google credentials (≈3 min, one time)

1. [Google Cloud Console](https://console.cloud.google.com/) →
   **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** → add your Supabase callback:
   ```
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   (Local dev with the Supabase CLI also: `http://127.0.0.1:54321/auth/v1/callback`.)
4. Save, then copy the **Client ID** and **Client secret**.

> `<YOUR-PROJECT-REF>` is the subdomain of your `VITE_SUPABASE_URL`
> (e.g. `https://abcdwxyz.supabase.co` → `abcdwxyz`).

---

## Step 2 — Apply them. Pick ONE path.

### Path A — One command (fully automated, hosted project)

```bash
cp .env.example .env          # then fill in the 4 values noted below
./scripts/enable-google-auth.sh
```

`.env` needs:

| Variable | Where to get it |
|---|---|
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | from Step 1 |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | from Step 1 |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | the subdomain of your project URL |

The script enables the Google provider and sets the redirect allow-list via the
Supabase Management API. Idempotent — safe to re-run.

### Path B — Dashboard (no token needed, ≈1 min)

**Authentication → Providers → Google** → toggle **Enabled**, paste the Client
ID and Secret, **Save**.

### Path C — Local Supabase CLI

Already enabled in `supabase/config.toml`. Just export the creds before starting:

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="GOCSPX-..."
supabase start
```

---

## Step 3 — Apply the database migration (one time)

```bash
supabase db push   # runs 010_brief_accounts.sql (briefs ↔ accounts, claim_my_briefs)
```

---

## What's already automated for you

- ✅ Google buttons on sign-in, sign-up, the homepage brief flow, and the order flow.
- ✅ OAuth redirect + `localStorage` draft-resume (the brief/order auto-submits on return).
- ✅ Google provider enabled in `supabase/config.toml` (env-based credentials, no secrets committed).
- ✅ Redirect allow-list (production, brief-resume path, local dev) in `config.toml` and via the script.
- ✅ `.env.example` template; `.env` is gitignored.
- ✅ `scripts/enable-google-auth.sh` for one-command hosted setup.

## Flow behaviour

- **Email/password:** new users created instantly (email confirmation off), so
  brief/order submission drops them straight into the workspace. Existing emails
  fall back to a password sign-in.
- **Google:** redirects to Google and back; in the brief/order flows the draft is
  restored and submitted automatically.

Every path creates a `public.profiles` row (via `handle_new_user`), so new
clients appear immediately on **Admin → Clients**, with their orders and briefs.
