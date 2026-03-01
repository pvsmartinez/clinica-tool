#!/bin/zsh
set -e

PAT="REDACTED_SUPABASE_PAT"
REF="nxztzehgnkdmluogxehi"
BOT_TOKEN="REDACTED_TELEGRAM_BOT_TOKEN"
PEDRO_CHAT_ID="6548209972"

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
