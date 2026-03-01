#!/bin/zsh
set -e

# ── Load credentials from pedrin/.env (source of truth, never committed) ──────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PEDRIN_ENV="$SCRIPT_DIR/../../pedrin/.env"
if [[ ! -f "$PEDRIN_ENV" ]]; then
  echo "ERROR: pedrin/.env not found at $PEDRIN_ENV"
  exit 1
fi
set -a; source "$PEDRIN_ENV"; set +a

PAT="${SUPABASE_PAT:?SUPABASE_PAT not set in pedrin/.env}"
REF="${SUPABASE_PROJECT_REF_CLINICA:?SUPABASE_PROJECT_REF_CLINICA not set in pedrin/.env}"
BOT_TOKEN="${CONSULTIN_TELEGRAM_BOT_TOKEN:?CONSULTIN_TELEGRAM_BOT_TOKEN not set in pedrin/.env}"
PEDRO_CHAT_ID="${TELEGRAM_PEDRO_CHAT_ID:?TELEGRAM_PEDRO_CHAT_ID not set in pedrin/.env}"

echo "=== 1. Applying migration 0015 ==="
SQL=$(cat /Users/pedromartinez/Dev/pmatz/consultin/supabase/migrations/0015_clinic_signup_requests.sql)
RESPONSE=$(curl -s -o /tmp/migration_resp.json -w "%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $PAT" \
  -H "Content-Type: application/json" \
  --data-binary "$(jq -n --arg q "$SQL" '{"query":$q}')")

echo "HTTP $RESPONSE: $(cat /tmp/migration_resp.json)"

echo ""
echo "=== 2. Setting Telegram secrets ==="
SUPABASE_ACCESS_TOKEN="$PAT" supabase secrets set \
  TELEGRAM_BOT_TOKEN="$BOT_TOKEN" \
  TELEGRAM_PEDRO_CHAT_ID="$PEDRO_CHAT_ID" \
  --project-ref "$REF" 2>&1

echo ""
echo "=== 3. Deploying notify-telegram function ==="
cd /Users/pedromartinez/Dev/pmatz/consultin
SUPABASE_ACCESS_TOKEN="$PAT" supabase functions deploy notify-telegram --project-ref "$REF" --no-verify-jwt 2>&1

echo ""
echo "=== 4. Deploying admin-users function ==="
SUPABASE_ACCESS_TOKEN="$PAT" supabase functions deploy admin-users --project-ref "$REF" 2>&1

echo ""
echo "=== Done! ==="
