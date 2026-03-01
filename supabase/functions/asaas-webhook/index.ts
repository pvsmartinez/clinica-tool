/**
 * Edge Function: asaas-webhook
 *
 * Recebe notificações de eventos de pagamento do Asaas e atualiza o DB.
 *
 * Configurar no painel Asaas:
 *   URL: https://<project-ref>.supabase.co/functions/v1/asaas-webhook
 *   Método: POST
 *   Enviar header: asaas-access-token: <valor igual ao ASAAS_WEBHOOK_TOKEN no Supabase Secrets>
 *
 * Eventos tratados:
 *   PAYMENT_RECEIVED  → status = RECEIVED
 *   PAYMENT_CONFIRMED → status = CONFIRMED
 *   PAYMENT_OVERDUE   → status = OVERDUE
 *   PAYMENT_DELETED   → status = CANCELLED
 *   PAYMENT_REFUNDED  → status = REFUNDED
 *
 * Se o externalReference do pagamento for um appointment_payment.id, atualiza esse registro.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Seleciona o token correto conforme ASAAS_ENV (sandbox | production) */
const ASAAS_ENV = Deno.env.get('ASAAS_ENV') ?? 'sandbox'
const isProd = ASAAS_ENV === 'production'
const WEBHOOK_TOKEN = isProd
  ? Deno.env.get('ASAAS_WEBHOOK_TOKEN_PRODUCTION') ?? ''
  : Deno.env.get('ASAAS_WEBHOOK_TOKEN_SANDBOX') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Mapa de eventos Asaas → status interno */
const EVENT_TO_STATUS: Record<string, string> = {
  PAYMENT_RECEIVED:  'RECEIVED',
  PAYMENT_CONFIRMED: 'CONFIRMED',
  PAYMENT_OVERDUE:   'OVERDUE',
  PAYMENT_DELETED:   'CANCELLED',
  PAYMENT_REFUNDED:  'REFUNDED',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  // ── Verificar token do webhook (se configurado) ────────────────────────────
  if (WEBHOOK_TOKEN) {
    const incomingToken = req.headers.get('asaas-access-token') ?? ''
    if (incomingToken !== WEBHOOK_TOKEN) {
      console.warn('[asaas-webhook] Token inválido')
      return new Response('Unauthorized', { status: 401, headers: CORS })
    }
  }

  // ── Ler payload ────────────────────────────────────────────────────────────
  let payload: { event: string; payment?: { id: string; status: string; externalReference?: string } }
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400, headers: CORS })
  }

  const { event, payment } = payload

  console.log(`[asaas-webhook] event=${event} payment=${payment?.id}`)

  // ── Processar evento de pagamento ─────────────────────────────────────────
  const newStatus = EVENT_TO_STATUS[event]
  if (newStatus && payment?.id) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Busca appointment_payment pelo asaas_charge_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: apRow, error: findErr } = await (supabase as any)
      .from('appointment_payments')
      .select('id, status, appointment_id, amount_cents')
      .eq('asaas_charge_id', payment.id)
      .single()

    if (findErr || !apRow) {
      // Pode vir de uma assinatura que não é de consulta (ex: cobrança mensal da clínica)
      // — apenas log, não é erro crítico
      console.log(`[asaas-webhook] Nenhum appointment_payment com asaas_payment_id=${payment.id}`)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (supabase as any)
        .from('appointment_payments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', apRow.id)

      if (updateErr) {
        console.error('[asaas-webhook] Erro ao atualizar status:', updateErr.message)
      } else {
        console.log(`[asaas-webhook] appointment_payment ${apRow.id} atualizado → ${newStatus}`)

        // Sincroniza appointments.paid_amount_cents para manter KPIs do Financeiro corretos
        if (newStatus === 'RECEIVED' || newStatus === 'CONFIRMED') {
          await supabase
            .from('appointments')
            .update({
              paid_amount_cents: apRow.amount_cents,
              paid_at: new Date().toISOString(),
              status: 'completed',
            })
            .eq('id', apRow.appointment_id)
        }
      }
    }
  }

  // Asaas espera 200 OK mesmo se não processamos o evento
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
