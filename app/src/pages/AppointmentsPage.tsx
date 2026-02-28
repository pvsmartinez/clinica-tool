import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import type { EventInput } from '@fullcalendar/core'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAppointmentsQuery, useAppointmentMutations } from '../hooks/useAppointmentsMutations'
import AppointmentModal from '../components/appointments/AppointmentModal'
import type { Appointment } from '../types'

const STATUS_COLORS: Record<string, string> = {
  scheduled:  '#3b82f6',
  confirmed:  '#22c55e',
  completed:  '#6b7280',
  cancelled:  '#ef4444',
  no_show:    '#f59e0b',
}

export default function AppointmentsPage() {
  const calendarRef = useRef<FullCalendar>(null)
  const today = new Date()
  const [range, setRange] = useState({
    start: startOfWeek(today).toISOString(),
    end:   endOfWeek(today).toISOString(),
  })

  const { data: appointments = [], isLoading } = useAppointmentsQuery(range.start, range.end)
  const { update } = useAppointmentMutations()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null)
  const [initialSlot, setInitialSlot] = useState<{ date: string; time: string } | null>(null)

  const events: EventInput[] = appointments.map(a => ({
    id:              a.id,
    title:           a.patient?.name ?? 'Paciente',
    start:           a.startsAt,
    end:             a.endsAt,
    backgroundColor: STATUS_COLORS[a.status] ?? '#3b82f6',
    borderColor:     STATUS_COLORS[a.status] ?? '#3b82f6',
    extendedProps:   { appointment: a },
  }))

  function handleDateSelect(arg: { start: Date; startStr: string; endStr: string; allDay: boolean }) {
    setEditingAppt(null)
    setInitialSlot({ date: format(arg.start, 'yyyy-MM-dd'), time: format(arg.start, 'HH:mm') })
    setModalOpen(true)
  }

  function handleEventClick(arg: EventClickArg) {
    setEditingAppt(arg.event.extendedProps.appointment as Appointment)
    setInitialSlot(null)
    setModalOpen(true)
  }

  async function handleEventDrop(arg: { event: { id: string; startStr: string; endStr: string; start: Date | null; extendedProps: Record<string, unknown> }; revert: () => void }) {
    const appt = arg.event.extendedProps.appointment as Appointment
    const newStart = arg.event.start!
    const diffMs   = new Date(appt.endsAt).getTime() - new Date(appt.startsAt).getTime()
    try {
      await update.mutateAsync({
        id: appt.id, patientId: appt.patientId, professionalId: appt.professionalId,
        startsAt: newStart.toISOString(),
        endsAt:   new Date(newStart.getTime() + diffMs).toISOString(),
        status: appt.status, notes: appt.notes, chargeAmountCents: appt.chargeAmountCents,
      })
      toast.success('Consulta remarcada')
    } catch {
      arg.revert()
      toast.error('Conflito de horário — não foi possível remarcar')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Agenda</h1>
        <button onClick={() => { setEditingAppt(null); setInitialSlot(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Nova consulta
        </button>
      </div>

      <div className={`bg-white rounded-xl border border-gray-100 p-4 relative ${isLoading ? 'opacity-60' : ''}`}>
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale="pt-br"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          nowIndicator
          editable
          selectable
          selectMirror
          dayMaxEvents
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          datesSet={info => setRange({ start: info.startStr, end: info.endStr })}
          contentHeight={620}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointment={editingAppt}
        initialDate={initialSlot?.date}
        initialTime={initialSlot?.time}
      />
    </div>
  )
}
