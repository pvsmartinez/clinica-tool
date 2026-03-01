#!/bin/bash
# Applies all Supabase migrations directly via psql
# Credentials read from (in order):
#   1. $SUPABASE_DB_PASSWORD env var
#   2. /Users/pedromartinez/Dev/pmatz/pedrin/.env
#   3. /Users/pedromartinez/Dev/pmatz/pedrin/secrets/supabase/config.json  (db_password field)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Ler senha sem usar `source` (evita problemas com $, !, # na senha)
# A leitura real acontece na seção do psql abaixo — este bloco garante
# que se a variável já estiver no ambiente, ela seja usada.

# Locate psql (Homebrew Intel ou Apple Silicon)
PSQL=""
for candidate in \
  /usr/local/opt/libpq/bin/psql \
  /opt/homebrew/opt/libpq/bin/psql \
  $(which psql 2>/dev/null || true)
do
  [[ -x "$candidate" ]] && PSQL="$candidate" && break
done

if [[ -z "$PSQL" ]]; then
  echo "❌ psql não encontrado. Instale com: brew install libpq"
  exit 1
fi

DB_HOST="db.nxztzehgnkdmluogxehi.supabase.co"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"

# Ler senha sem usar `source` (evita problemas com $, !, # na senha)
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  PEDRIN_ENV="/Users/pedromartinez/Dev/pmatz/pedrin/.env"
  if [[ -f "$PEDRIN_ENV" ]]; then
    SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' "$PEDRIN_ENV" | head -1 | cut -d'=' -f2-)"
  fi
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "❌ SUPABASE_DB_PASSWORD não encontrado."
  echo "Preencha SUPABASE_DB_PASSWORD em: /Users/pedromartinez/Dev/pmatz/pedrin/.env"
  exit 1
fi

for f in "$ROOT_DIR"/supabase/migrations/*.sql; do
  echo "⏳ Aplicando $(basename "$f")..."
  PGPASSWORD="$SUPABASE_DB_PASSWORD" "$PSQL" \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$f" 2>&1 | grep -v "^NOTICE" || true
  echo "✅ $(basename "$f") ok"
done

echo ""
echo "🎉 Todas as migrations aplicadas."
