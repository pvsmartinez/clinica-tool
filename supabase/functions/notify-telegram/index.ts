/**
 * Edge Function: notify-telegram
 *
 * Sends a Telegram message to Pedro when a new clinic signup request arrives.
 * Called from the frontend after inserting a clinic_signup_request.
 *
 * POST /notify-telegram
 *   body: { clinicName, responsibleName, email, phone?, message? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID   = Deno.env.get('TELEGRAM_PEDRO_CHAT_ID')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: {
    clinicName: string
    responsibleName: string
    email: string
    phone?: string
    message?: string
  }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (!body.clinicName || !body.responsibleName || !body.email) {
    return json({ error: 'clinicName, responsibleName e email são obrigatórios' }, 400)
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_PEDRO_CHAT_ID not set')
    return json({ error: 'Telegram credentials not configured' }, 500)
  }

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const text = [
    '🏥 *Nova solicitação de clínica*',
    '',
    `*Clínica:* ${body.clinicName}`,
    `*Responsável:* ${body.responsibleName}`,
    `*E-mail:* ${body.email}`,
    body.phone ? `*Telefone:* ${body.phone}` : null,
    body.message ? `*Mensagem:* ${body.message}` : null,
    '',
    `_Recebido em ${now}_`,
    '',
    `👉 Acesse /admin → Aprovações para revisar`,
  ].filter(line => line !== null).join('\n')

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    },
  )

  if (!telegramRes.ok) {
    const telegramErr = await telegramRes.text()
    console.error('Telegram API error:', telegramErr)
    // Don't fail the request if Telegram notification fails
    return json({ ok: true, telegram: 'failed' })
  }

  return json({ ok: true })
})
