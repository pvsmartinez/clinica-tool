import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash, Gear, CalendarBlank, Sliders } from '@phosphor-icons/react'
import { toast } from 'sonner'
import Input from '../components/ui/Input'
import { useClinic } from '../hooks/useClinic'
import type { Clinic, CustomFieldDef, CustomFieldType, WorkingHours } from '../types'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'dados' | 'agenda' | 'campos'
const TABS: { id: Tab; label: string; icon: typeof Gear }[] = [
  { id: 'dados', label: 'Dados da clínica', icon: Gear },
  { id: 'agenda', label: 'Agenda', icon: CalendarBlank },
  { id: 'campos', label: 'Campos personalizados', icon: Sliders },
]

// ─── Schemas ─────────────────────────────────────────────────────────────────
const dadosSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
})
type DadosForm = z.infer<typeof dadosSchema>

const WEEKDAYS = [
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
] as const

const SLOT_DURATIONS = [15, 20, 30, 45, 60]
const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Lista de opções' },
  { value: 'boolean', label: 'Sim / Não' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('dados')
  const { data: clinic, isLoading } = useClinic()

  if (isLoading) return <div className="text-sm text-gray-400 py-8 text-center">Carregando...</div>
  if (!clinic) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-800">Configurações</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${tab === t.id ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dados' && <DadosTab clinic={clinic} />}
      {tab === 'agenda' && <AgendaTab clinic={clinic} />}
      {tab === 'campos' && <CamposTab clinic={clinic} />}
    </div>
  )
}

// ─── Tab: Dados da clínica ────────────────────────────────────────────────────
function DadosTab({ clinic }: { clinic: Clinic }) {
  const { update } = useClinic()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<DadosForm>({
    resolver: zodResolver(dadosSchema),
  })

  useEffect(() => {
    reset({
      name: clinic.name,
      cnpj: clinic.cnpj ?? '',
      phone: clinic.phone ?? '',
      email: clinic.email ?? '',
      address: clinic.address ?? '',
      city: clinic.city ?? '',
      state: clinic.state ?? '',
    })
  }, [clinic, reset])

  async function onSubmit(values: DadosForm) {
    try {
      await update.mutateAsync({
        name: values.name,
        cnpj: values.cnpj || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
      })
      toast.success('Dados salvos')
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome da clínica *" error={errors.name?.message} {...register('name')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="CNPJ" placeholder="00.000.000/0001-00" {...register('cnpj')} />
        <Input label="Telefone" {...register('phone')} />
      </div>
      <Input label="E-mail" type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Endereço" {...register('address')} />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Cidade" {...register('city')} /></div>
        <Input label="UF" maxLength={2} {...register('state')} />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting || !isDirty}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
          {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  )
}

// ─── Tab: Agenda ──────────────────────────────────────────────────────────────
function AgendaTab({ clinic }: { clinic: Clinic }) {
  const { update } = useClinic()
  const [slotDuration, setSlotDuration] = useState(clinic.slotDurationMinutes)
  const [hours, setHours] = useState<Partial<Record<string, WorkingHours>>>(clinic.workingHours ?? {})
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await update.mutateAsync({ slotDurationMinutes: slotDuration, workingHours: hours as Record<string, WorkingHours> })
      toast.success('Configurações de agenda salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function toggleDay(key: string) {
    setHours(prev => {
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = { start: '08:00', end: '18:00' }
      return next
    })
  }

  function updateHour(key: string, field: 'start' | 'end', value: string) {
    setHours(prev => ({ ...prev, [key]: { ...prev[key]!, [field]: value } }))
  }

  return (
    <div className="space-y-6">
      {/* Slot duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Duração padrão da consulta</label>
        <div className="flex gap-2">
          {SLOT_DURATIONS.map(d => (
            <button key={d} type="button"
              onClick={() => setSlotDuration(d)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${slotDuration === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Dias e horários de funcionamento</label>
        <div className="space-y-2">
          {WEEKDAYS.map(({ key, label }) => {
            const active = !!hours[key]
            const wh = hours[key]
            return (
              <div key={key} className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-28 cursor-pointer">
                  <input type="checkbox" checked={active} onChange={() => toggleDay(key)}
                    className="rounded border-gray-300" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
                {active && wh ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={wh.start} onChange={e => updateHour(key, 'start', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm" />
                    <span className="text-gray-400 text-sm">até</span>
                    <input type="time" value={wh.end} onChange={e => updateHour(key, 'end', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm" />
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">Fechado</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Campos personalizados ──────────────────────────────────────────────
function CamposTab({ clinic }: { clinic: Clinic }) {
  const { update } = useClinic()
  const [fields, setFields] = useState<CustomFieldDef[]>(clinic.customPatientFields ?? [])
  const [saving, setSaving] = useState(false)
  const [newField, setNewField] = useState<Partial<CustomFieldDef>>({ type: 'text', required: false })

  function addField() {
    if (!newField.label?.trim()) { toast.error('Informe o nome do campo'); return }
    const key = newField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (fields.some(f => f.key === key)) { toast.error('Já existe um campo com esse nome'); return }
    setFields(prev => [...prev, { key, label: newField.label!, type: newField.type ?? 'text', required: newField.required ?? false }])
    setNewField({ type: 'text', required: false })
  }

  function removeField(key: string) {
    setFields(prev => prev.filter(f => f.key !== key))
  }

  async function save() {
    setSaving(true)
    try {
      await update.mutateAsync({ customPatientFields: fields })
      toast.success('Campos salvos')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Campos extras que aparecerão no cadastro de pacientes desta clínica.
      </p>

      {/* Existing fields */}
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.key} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-700">{f.label}</p>
                <p className="text-xs text-gray-400">
                  {FIELD_TYPES.find(t => t.value === f.type)?.label}
                  {f.required && ' · Obrigatório'}
                </p>
              </div>
              <button onClick={() => removeField(f.key)} className="text-gray-400 hover:text-red-500">
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new field */}
      <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Adicionar campo</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome do campo</label>
            <input value={newField.label ?? ''} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
              placeholder="ex: Plano de saúde"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={newField.type} onChange={e => setNewField(p => ({ ...p, type: e.target.value as CustomFieldType }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={newField.required ?? false}
            onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))} className="rounded" />
          Campo obrigatório
        </label>
        <button onClick={addField}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus size={15} /> Adicionar
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
          {saving ? 'Salvando...' : 'Salvar campos'}
        </button>
      </div>
    </div>
  )
}
