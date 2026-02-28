import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format, parseISO, addMinutes } from 'date-fns'
import Input from '../ui/Input'
import TextArea from '../ui/TextArea'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useAppointmentMutations } from '../../hooks/useAppointmentsMutations'
import { usePatients } from '../../hooks/usePatients'
import {
  APPOINTMENT_STATUS_LABELS,
  type Appointment,
  type AppointmentStatus,
} from '../../types'

// ─── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  professionalId: z.string().min(1, 'Selecione um profissional'),
  date: z.string().min(1, 'Data obrigatória'),
  startTime: z.string().min(1, 'Horário obrigatório'),
  durationMin: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  chargeAmount: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DURATIONS = [15, 20, 30, 45, 60, 90, 120]
const STATUSES = Object.entries(APPOINTMENT_STATUS_LABELS) as [AppointmentStatus, string][]

function toUTC(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  appointment?: Appointment | null
  /** Pre-fill date + time when clicking a slot on the calendar */
  initialDate?: string   // YYYY-MM-DD
  initialTime?: string   // HH:MM
  /** Default professional from calendar column */
  initialProfessionalId?: string
}

export default function AppointmentModal({
  open, onClose, appointment,
  initialDate, initialTime, initialProfessionalId,
}: Props) {
  const isEditing = !!appointment
  const { data: professionals = [] } = useProfessionals()
  const { patients = [] } = usePatients('')
  const { create, update, cancel } = useAppointmentMutations()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { durationMin: '30', status: 'scheduled' },
  })

  useEffect(() => {
    if (!open) { setConfirmCancel(false); return }

    if (appointment) {
      const start = parseISO(appointment.startsAt)
      const end = parseISO(appointment.endsAt)
      const diffMin = Math.round((end.getTime() - start.getTime()) / 60000)
      reset({
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        durationMin: String(DURATIONS.includes(diffMin) ? diffMin : 30),
        status: appointment.status,
        notes: appointment.notes ?? '',
        chargeAmount: appointment.chargeAmountCents != null
          ? (appointment.chargeAmountCents / 100).toFixed(2).replace('.', ',')
          : '',
      })
    } else {
      reset({
        patientId: '',
        professionalId: initialProfessionalId ?? '',
        date: initialDate ?? format(new Date(), 'yyyy-MM-dd'),
        startTime: initialTime ?? '08:00',
        durationMin: '30',
        status: 'scheduled',
        notes: '',
        chargeAmount: '',
      })
    }
  }, [open, appointment, initialDate, initialTime, initialProfessionalId, reset])

  async function onSubmit(values: FormValues) {
    try {
      const startsAt = toUTC(values.date, values.startTime)
      const endsAt = addMinutes(new Date(startsAt), parseInt(values.durationMin)).toISOString()
      const chargeAmountCents = values.chargeAmount
        ? Math.round(parseFloat(values.chargeAmount.replace(',', '.')) * 100)
        : null

      const payload = {
        patientId: values.patientId,
        professionalId: values.professionalId,
        startsAt,
        endsAt,
        status: values.status as AppointmentStatus,
        notes: values.notes || null,
        chargeAmountCents,
      }

      if (isEditing) {
        await update.mutateAsync({ id: appointment!.id, ...payload })
        toast.success('Consulta atualizada')
      } else {
        await create.mutateAsync(payload)
        toast.success('Consulta agendada')
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('no_overlap')) {
        toast.error('Conflito de horário — profissional já tem consulta nesse horário')
      } else {
        toast.error('Erro ao salvar consulta')
      }
    }
  }

  async function handleCancel() {
    if (!appointment) return
    try {
      await cancel.mutateAsync(appointment.id)
      toast.success('Consulta cancelada')
      onClose()
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const activeProfessionals = professionals.filter(p => p.active)

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 focus:outline-none max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-800">
              {isEditing ? 'Editar consulta' : 'Nova consulta'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Patient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('patientId')}
              >
                <option value="">Selecione o paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.cpf ? ` · ${p.cpf}` : ''}</option>
                ))}
              </select>
              {errors.patientId && <p className="text-xs text-red-500 mt-1">{errors.patientId.message}</p>}
            </div>

            {/* Professional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profissional *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('professionalId')}
              >
                <option value="">Selecione o profissional...</option>
                {activeProfessionals.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.specialty ? ` — ${p.specialty}` : ''}
                  </option>
                ))}
              </select>
              {errors.professionalId && <p className="text-xs text-red-500 mt-1">{errors.professionalId.message}</p>}
            </div>

            {/* Date + time + duration */}
            <div className="grid grid-cols-3 gap-3">
              <Input label="Data *" type="date" error={errors.date?.message} {...register('date')} />
              <Input label="Horário *" type="time" error={errors.startTime?.message} {...register('startTime')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duração</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('durationMin')}
                >
                  {DURATIONS.map(d => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('status')}
              >
                {STATUSES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Charge */}
            <Input
              label="Valor cobrado (R$)"
              placeholder="0,00"
              {...register('chargeAmount')}
            />

            {/* Notes */}
            <TextArea label="Observações" rows={2} {...register('notes')} />

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {isEditing && !confirmCancel && (
                <button type="button" onClick={() => setConfirmCancel(true)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700">
                  <Trash size={15} /> Cancelar consulta
                </button>
              )}
              {isEditing && confirmCancel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Confirmar cancelamento?</span>
                  <button type="button" onClick={handleCancel}
                    className="text-sm font-medium text-red-600 hover:underline">Sim</button>
                  <button type="button" onClick={() => setConfirmCancel(false)}
                    className="text-sm text-gray-400 hover:underline">Não</button>
                </div>
              )}
              {!confirmCancel && (
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    Fechar
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {isSubmitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
