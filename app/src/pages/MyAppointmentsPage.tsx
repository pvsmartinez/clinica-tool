import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarBlank, Clock } from '@phosphor-icons/react'
import { supabase } from '../services/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../types'
import type { Appointment } from '../types'

function mapRow(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    clinicId: row.clinic_id as string,
    patientId: row.patient_id as string,
    professionalId: row.professional_id as string,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    status: row.status as Appointment['status'],
    notes: (row.notes as string) ?? null,
    chargeAmountCents: (row.charge_amount_cents as number) ?? null,
    paidAmountCents: (row.paid_amount_cents as number) ?? null,
    paidAt: (row.paid_at as string) ?? null,
    createdAt: row.created_at as string,
    patient: undefined,
    professional: row.professional as Appointment['professional'],
  }
}

export default function MyAppointmentsPage() {
  const { session } = useAuthContext()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    // Find the patient record linked to this auth user, then load their appointments
    supabase
      .from('patients')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data: patient }) => {
        if (!patient) { setLoading(false); return }
        return supabase
          .from('appointments')
          .select('*, professional:professionals(id, name, specialty)')
          .eq('patient_id', patient.id)
          .order('starts_at', { ascending: false })
      })
      .then(result => {
        if (result && !result.error) {
          setAppointments((result.data ?? []).map(r => mapRow(r as Record<string, unknown>)))
        }
        setLoading(false)
      })
  }, [session])

  const upcoming = appointments.filter(a => new Date(a.startsAt) >= new Date())
  const past = appointments.filter(a => new Date(a.startsAt) < new Date())

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="text-gray-400 text-sm">Carregando consultas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-gray-800">Minhas Consultas</h1>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          Próximas
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center bg-white rounded-xl border border-gray-100">
            Nenhuma consulta agendada.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(appt => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </ul>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Histórico
          </h2>
          <ul className="space-y-2">
            {past.map(appt => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const statusColor = APPOINTMENT_STATUS_COLORS[a.status] ?? '#6b7280'
  const statusLabel = APPOINTMENT_STATUS_LABELS[a.status] ?? a.status
  const dateLabel = format(parseISO(a.startsAt), "dd 'de' MMMM yyyy", { locale: ptBR })
  const timeLabel = format(parseISO(a.startsAt), 'HH:mm')

  return (
    <li className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-800">
            {a.professional?.name ?? 'Profissional não informado'}
          </p>
          {a.professional?.specialty && (
            <p className="text-xs text-gray-400">{a.professional.specialty}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
            <span className="flex items-center gap-1">
              <CalendarBlank size={12} />
              {dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeLabel}
            </span>
          </div>
        </div>
        <span
          className="shrink-0 text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  )
}
