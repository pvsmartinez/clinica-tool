import { useState } from 'react'
import { WhatsappLogo, Copy, ArrowClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useClinic } from '../../hooks/useClinic'
import { storeWhatsAppToken } from '../../services/whatsapp'
import { WA_AI_MODELS } from '../../types'
import type { Clinic } from '../../types'

const WEBHOOK_STEPS = [
  { n: 1, text: 'No Meta for Developers, crie um App do tipo "Business".' },
  { n: 2, text: 'Adicione o produto "WhatsApp" ao seu app e configure um número de telefone.' },
  { n: 3, text: 'Em Webhooks, use a URL abaixo e o Token de Verificação gerado aqui.' },
  { n: 4, text: 'Copie o Token de Acesso Permanente e cole no campo abaixo.' },
  { n: 5, text: 'Clique em Salvar. Pronto — seu WhatsApp está conectado! 🟢' },
]

export default function WhatsAppTab({ clinic }: { clinic: Clinic }) {
  const { update } = useClinic()
  const [step,         setStep]         = useState<'guide' | 'form'>('guide')
  const [accessToken,  setAccessToken]  = useState('')
  const [phoneId,      setPhoneId]      = useState(clinic.whatsappPhoneNumberId ?? '')
  const [phoneDisplay, setPhoneDisplay] = useState(clinic.whatsappPhoneDisplay ?? '')
  const [wabaId,       setWabaId]       = useState(clinic.whatsappWabaId ?? '')
  const [aiModel,      setAiModel]      = useState(clinic.waAiModel ?? 'openai/gpt-4o-mini')
  const [saving,       setSaving]       = useState(false)

  const verifyToken = clinic.whatsappVerifyToken
    ?? `consultin_${clinic.id.replace(/-/g, '').slice(0, 16)}`

  const projectUrl = (window as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL
    ?? import.meta.env.VITE_SUPABASE_URL ?? ''
  const webhookUrl = projectUrl
    ? `${projectUrl}/functions/v1/whatsapp-webhook`
    : 'https://<project>.supabase.co/functions/v1/whatsapp-webhook'

  async function handleSave() {
    if (!phoneId || !phoneDisplay || !wabaId) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      await update.mutateAsync({
        whatsappPhoneNumberId: phoneId,
        whatsappPhoneDisplay:  phoneDisplay,
        whatsappWabaId:        wabaId,
        whatsappVerifyToken:   verifyToken,
        waAiModel:             aiModel,
      })

      if (accessToken.trim()) {
        await storeWhatsAppToken(clinic.id, accessToken.trim())
      }

      toast.success('WhatsApp configurado com sucesso!')
      setStep('guide')
      setAccessToken('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleReminders(
    field: 'waRemindersd1' | 'waRemindersd0' | 'waProfessionalAgenda' | 'waAttendantInbox',
    value: boolean,
  ) {
    await update.mutateAsync({ [field]: value })
    toast.success('Configuração salva')
  }

  async function handleDisconnect() {
    await update.mutateAsync({ whatsappEnabled: false })
    toast.success('WhatsApp desconectado')
  }

  if (clinic.whatsappEnabled && step !== 'form') {
    return (
      <div className="space-y-6">
        {/* Status banner */}
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">WhatsApp conectado</p>
            <p className="text-xs text-green-600">{clinic.whatsappPhoneDisplay}</p>
          </div>
          <button onClick={() => setStep('form')}
            className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 px-3 py-1.5 border border-green-300 rounded-lg">
            <ArrowClockwise size={13} /> Reconfigurar
          </button>
        </div>

        {/* Feature toggles */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {([
            { key: 'waRemindersd1',        label: 'Lembrete D-1 (véspera)',             desc: 'Envia lembrete 1 dia antes da consulta com botões Confirmar / Cancelar' },
            { key: 'waRemindersd0',        label: 'Lembrete D-0 (dia da consulta)',     desc: 'Envia lembrete no dia da consulta às 07:00' },
            { key: 'waProfessionalAgenda', label: 'Agenda diária para profissionais',   desc: 'Envia a agenda do dia para cada profissional às 07:30' },
            { key: 'waAttendantInbox',     label: 'Caixa de mensagens (atendentes)',    desc: 'Sessões que o AI não resolveu aparecem na caixa de mensagens' },
          ] as { key: 'waRemindersd1'|'waRemindersd0'|'waProfessionalAgenda'|'waAttendantInbox'; label: string; desc: string }[]).map(({ key, label, desc }) => {
            const value = clinic[key] as boolean
            return (
              <div key={key} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggleReminders(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )
          })}
        </div>

        {/* AI model picker */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">Modelo de IA (via OpenRouter)</p>
          <p className="text-xs text-gray-400">Usado para entender mensagens dos pacientes e sugerir respostas.</p>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            onBlur={() => update.mutateAsync({ waAiModel: aiModel })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
            {WA_AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <button onClick={handleDisconnect}
          className="text-sm text-red-500 hover:text-red-700 underline">
          Desconectar WhatsApp
        </button>
      </div>
    )
  }

  // ── Setup / guide state ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <WhatsappLogo size={20} weight="fill" className="text-green-500" />
          Conectar WhatsApp Business
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Siga os passos abaixo para conectar o número de WhatsApp da sua clínica via Meta Cloud API (gratuito).
        </p>
      </div>

      <div className="space-y-3">
        {WEBHOOK_STEPS.map((s) => (
          <div key={s.n} className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
              {s.n}
            </span>
            <p className="text-sm text-gray-600 pt-0.5">{s.text}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">URL do Webhook</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <code className="text-xs text-gray-700 flex-1 break-all">{webhookUrl}</code>
          <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copiado!') }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Token de Verificação</p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <code className="text-xs text-gray-700 flex-1">{verifyToken}</code>
          <button onClick={() => { navigator.clipboard.writeText(verifyToken); toast.success('Copiado!') }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Phone Number ID <span className="text-red-400">*</span>
          </label>
          <input
            value={phoneId}
            onChange={(e) => setPhoneId(e.target.value)}
            placeholder="123456789012345"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300"
          />
          <p className="text-xs text-gray-400 mt-1">Encontrado em: Meta for Developers → Seu App → WhatsApp → Configuração</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Número de telefone (exibição) <span className="text-red-400">*</span>
          </label>
          <input
            value={phoneDisplay}
            onChange={(e) => setPhoneDisplay(e.target.value)}
            placeholder="+55 11 91234-5678"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            WhatsApp Business Account ID (WABA ID) <span className="text-red-400">*</span>
          </label>
          <input
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="987654321098765"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Token de Acesso Permanente <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAxxxxxxxxxxxxxxx..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300"
          />
          <p className="text-xs text-gray-400 mt-1">
            🔒 Armazenado com criptografia (Supabase Vault) — nunca exposto no frontend.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Modelo de IA</label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white">
            {WA_AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !phoneId || !phoneDisplay || !wabaId || !accessToken}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors">
            {saving ? 'Salvando...' : 'Conectar WhatsApp'}
          </button>
          {clinic.whatsappEnabled && (
            <button onClick={() => setStep('guide')}
              className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
