#!/bin/bash
# Applies all Supabase migrations directly via psql
# Requires: SUPABASE_DB_PASSWORD in environment or .env file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load credentials from personal-admin .env if not set
if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  source /Users/pedromartinez/Dev/personal-admin/.env 2>/dev/null || true
fi

if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  echo "❌ SUPABASE_DB_PASSWORD not set"
  exit 1
fi

PSQL="/usr/local/opt/libpq/bin/psql"
if [[ ! -f "$PSQL" ]]; then
  PSQL=$(which psql 2>/dev/null || echo "")
fi
if [[ -z "$PSQL" ]]; then
  echo "❌ psql not found. Run: brew install libpq"
  exit 1
fi

DB_URL="postgresql://postgres@db.bpipnidvqygjjfhwfhtv.supabase.co:5432/postgres"

for f in "$ROOT_DIR"/supabase/migrations/*.sql; do
  echo "⏳ Applying $(basename "$f")..."
  PGPASSWORD="$SUPABASE_DB_PASSWORD" "$PSQL" "$DB_URL" -f "$f" 2>&1 \
    | grep -v "^NOTICE" || true
  echo "✅ $(basename "$f") done"
done

echo ""
echo "🎉 All migrations applied."
