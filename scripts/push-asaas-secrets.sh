#!/usr/bin/env bash
# push-asaas-secrets.sh
# Sobe os secrets do Asaas para o Supabase e faz deploy das Edge Functions.
#
# Pré-requisito: Supabase CLI autenticado
#   brew install supabase/tap/supabase   (já instalado)
#   supabase login                        ← rodar UMA vez no browser
#
# Alternativa sem browser (CI / terminal headless):
#   Gere um Personal Access Token em https://app.supabase.com/account/tokens
#   e exporte: export SUPABASE_ACCESS_TOKEN=sbp_...
#
# Uso:
#   bash scripts/push-asaas-secrets.sh            # sandbox (padrão)
#   bash scripts/push-asaas-secrets.sh production # produção
set -euo pipefail

PROJECT_REF="nxztzehgnkdmluogxehi"
ENV="${1:-sandbox}"

# ── Carregar .env (sem interpretar $, suporta valores com cifrão) ────────────
ENV_FILE="$(dirname "$0")/../app/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  Arquivo não encontrado: $ENV_FILE" && exit 1
fi

# Lê cada variável pelo nome, ignorando comentários e linhas vazias
_env_get() { grep -E "^$1=" "$ENV_FILE" | head -1 | sed "s/^$1=//" || true; }

ASAAS_API_KEY_PRODUCTION="$(_env_get ASAAS_API_KEY_PRODUCTION)"
ASAAS_API_KEY_SANDBOX="$(_env_get ASAAS_API_KEY_SANDBOX)"
ASAAS_WEBHOOK_TOKEN_PRODUCTION="$(_env_get ASAAS_WEBHOOK_TOKEN_PRODUCTION)"
ASAAS_WEBHOOK_TOKEN_SANDBOX="$(_env_get ASAAS_WEBHOOK_TOKEN_SANDBOX)"

# ── Validar chaves ───────────────────────────────────────────────────────────
[[ -z "$ASAAS_API_KEY_PRODUCTION" ]]      && echo "❌  ASAAS_API_KEY_PRODUCTION não encontrada em app/.env"      && exit 1
[[ -z "$ASAAS_API_KEY_SANDBOX" ]]         && echo "❌  ASAAS_API_KEY_SANDBOX não encontrada em app/.env"         && exit 1
[[ -z "$ASAAS_WEBHOOK_TOKEN_PRODUCTION" ]] && echo "❌  ASAAS_WEBHOOK_TOKEN_PRODUCTION não encontrada em app/.env" && exit 1
[[ -z "$ASAAS_WEBHOOK_TOKEN_SANDBOX" ]]   && echo "❌  ASAAS_WEBHOOK_TOKEN_SANDBOX não encontrada em app/.env"   && exit 1

echo "🔑  Subindo secrets Asaas → projeto $PROJECT_REF (ASAAS_ENV=$ENV)..."

supabase secrets set \
  "ASAAS_ENV=$ENV" \
  "ASAAS_API_KEY_SANDBOX=$ASAAS_API_KEY_SANDBOX" \
  "ASAAS_API_KEY_PRODUCTION=$ASAAS_API_KEY_PRODUCTION" \
  "ASAAS_WEBHOOK_TOKEN_SANDBOX=$ASAAS_WEBHOOK_TOKEN_SANDBOX" \
  "ASAAS_WEBHOOK_TOKEN_PRODUCTION=$ASAAS_WEBHOOK_TOKEN_PRODUCTION" \
  --project-ref "$PROJECT_REF"

echo "✅  Secrets enviados."

# ── Deploy das Edge Functions ─────────────────────────────────────────────────
echo "🚀  Fazendo deploy das Edge Functions..."

supabase functions deploy asaas         --project-ref "$PROJECT_REF"
supabase functions deploy asaas-webhook --project-ref "$PROJECT_REF"

echo ""
echo "✅  Deploy concluído!"
echo ""
echo "📋  URL do webhook para configurar no painel Asaas:"
echo "    https://$PROJECT_REF.supabase.co/functions/v1/asaas-webhook"
echo ""
echo "    Header de autenticação:"
if [[ "$ENV" == "production" ]]; then
  echo "    asaas-access-token: $ASAAS_WEBHOOK_TOKEN_PRODUCTION"
else
  echo "    asaas-access-token: $ASAAS_WEBHOOK_TOKEN_SANDBOX"
fi
