#!/usr/bin/env bash
#
# enable-google-auth.sh — turn on Google sign-in for the HOSTED Supabase project
# with one command, via the Supabase Management API. Idempotent.
#
# Requires these values (from the environment, or a local .env file):
#   SUPABASE_ACCESS_TOKEN                       sbp_...  (account → tokens)
#   SUPABASE_PROJECT_REF                        the subdomain of your project URL
#   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID     ...apps.googleusercontent.com
#   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET        GOCSPX-...
#
# Usage:
#   ./scripts/enable-google-auth.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env if present (without clobbering already-exported vars).
if [[ -f .env ]]; then
  set -a; # shellcheck disable=SC1091
  source .env; set +a
fi

REDIRECTS="https://primemeridian.academy,https://primemeridian.academy/**,http://127.0.0.1:3000,http://127.0.0.1:3000/**,http://localhost:3000,http://localhost:3000/**"
SITE_URL="${SITE_URL:-https://primemeridian.academy}"

missing=()
for v in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF \
         SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET; do
  [[ -z "${!v:-}" ]] && missing+=("$v")
done
if (( ${#missing[@]} )); then
  echo "✗ Missing required value(s):"
  printf '   - %s\n' "${missing[@]}"
  echo
  echo "Set them in .env (copy from .env.example) or export them, then re-run."
  echo "Prefer the dashboard instead? Auth → Providers → Google → paste the two"
  echo "Google credentials and save. That's all that's needed."
  exit 1
fi

API="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/auth"

echo "→ Enabling Google provider on project ${SUPABASE_PROJECT_REF} …"

http_code=$(curl -sS -o /tmp/meridian_auth_resp.json -w '%{http_code}' \
  -X PATCH "$API" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "external_google_enabled": true,
  "external_google_client_id": "${SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID}",
  "external_google_secret": "${SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET}",
  "external_google_skip_nonce_check": true,
  "site_url": "${SITE_URL}",
  "uri_allow_list": "${REDIRECTS}"
}
JSON
)

if [[ "$http_code" == "200" ]]; then
  echo "✓ Google sign-in is enabled and redirect URLs are configured."
  echo "  Callback URL (add this in Google Cloud → Authorized redirect URIs):"
  echo "    https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback"
else
  echo "✗ Management API returned HTTP ${http_code}:"
  cat /tmp/meridian_auth_resp.json; echo
  exit 1
fi
