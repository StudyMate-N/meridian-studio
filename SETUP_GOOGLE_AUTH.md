# Enabling Google Sign-In

The app already ships the "Continue with Google" buttons (sign-in, sign-up,
brief flow, and order flow). To make them work you need to register OAuth
credentials with Google and give them to Supabase. This is a one-time setup.

## 1. Create Google OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized redirect URIs**, add your Supabase callback URL:
   ```
   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   (For local development with the Supabase CLI, also add:
   `http://127.0.0.1:54321/auth/v1/callback`.)
5. Save. Copy the **Client ID** and **Client secret**.

## 2. Add the credentials to Supabase

### Hosted project (Supabase Dashboard)
**Authentication → Providers → Google** → toggle **Enabled**, paste the
Client ID and Client secret, and save. That's it — the dashboard setting
takes effect immediately.

### Local / self-hosted (config.toml)
`supabase/config.toml` already enables the provider:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
skip_nonce_check = true
```

Provide the credentials as environment variables before starting Supabase:

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="GOCSPX-..."
supabase start   # or: supabase db push / supabase deploy
```

> Never commit the secret. Keep it in env vars or your secret manager only.

## 3. Configure redirect URLs

In **Authentication → URL Configuration**, make sure your site URL and the
following redirect URLs are allow-listed so users land back in the app after
Google:

- `https://primemeridian.academy/workspace`
- `https://primemeridian.academy/` (the homepage brief flow resumes here)
- your local dev origin (e.g. `http://127.0.0.1:3000/workspace` and `/`)

## 4. Apply the database migration

```bash
supabase db push
```

This runs `010_brief_accounts.sql`, which links briefs to client accounts and
adds `claim_my_briefs()`.

---

### How the flows behave

- **Sign-in / Sign-up screens:** "Continue with Google" redirects to Google and
  back to `/workspace`.
- **Brief flow (homepage):** the in-progress brief is saved to `localStorage`
  before redirecting to Google. On return, the homepage detects the saved draft,
  reopens the brief, and submits it automatically — now linked to the account.
- **Order flow (catalog):** same draft-persist + auto-resume behaviour, landing
  in the workspace with the order placed.
- **Email/password:** new users are created instantly (email confirmation is off
  in `config.toml`). Existing emails fall back to a password sign-in.

Every one of these creates a row in `public.profiles` (via the `handle_new_user`
trigger), so new clients appear immediately on the **Admin → Clients** page,
along with their orders and submitted briefs.
