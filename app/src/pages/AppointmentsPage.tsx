import { useState, useMemo } from 'react'
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { useAppointments } from '../hooks/useAppointments'
import Badge from '../components/ui/Badge'
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
} from '../types'
import { formatTime, TZ_BR } from '../utils/date'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 07 … 19

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toLocalDateStr(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ_BR }).format(date)
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  return `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')} – ${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}/${end.getFullYear()}`
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const rangeStart = weekStart.toISOString()
  const rangeEnd = addDays(weekStart, 7).toISOString()
  const { appointments, loading } = useAppointments(rangeStart, rangeEnd)

  // Group appointments by day-string (YYYY-MM-DD local)
  const byDay = useMemo(() => {
    const map: Record<string, typeof appointments> = {}
    for (const apt of appointments) {
      const key = toLocalDateStr(new Date(apt.startsAt))
      if (!map[key]) map[key] = []
      map[key].push(apt)
    }
    return map
  }, [appointments])

  const todayStr = toLocalDateStr(new Date())

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">Agenda</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart(w => addDays(w, -7))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
            >
              <CaretLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 min-w-[170px] text-center">{formatWeekRange(weekStart)}</span>
            <button
              onClick={() => setWeekStart(w => addDays(w, 7))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
            >
              <CaretRight size={16} />
            </button>
          </div>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-xs text-blue-600 hover:underline"
          >
            Hoje
          </button>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} />
          Nova consulta
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : (
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div />
              {weekDays.map(day => {
                const dayStr = toLocalDateStr(day)
                const isToday = dayStr === todayStr
                return (
                  <div key={dayStr} className={`py-3 text-center border-l border-gray-100 ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="text-xs text-gray-400">{WEEKDAYS[day.getDay()]}</div>
                    <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="grid border-b border-gray-50 hover:bg-gray-50/50"
                style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '56px' }}
              >
                {/* Time label */}
                <div className="text-right pr-3 pt-1 text-xs text-gray-300 select-none">
                  {hour.toString().padStart(2, '0')}:00
                </div>

                {/* Day cells */}
                {weekDays.map(day => {
                  const dayStr = toLocalDateStr(day)
                  const isToday = dayStr === todayStr
                  const cellApts = (byDay[dayStr] ?? []).filter(a => {
                    const h = new Date(a.startsAt).getHours()
                    return h === hour
                  })
                  return (
                    <div
                      key={dayStr}
                      className={`border-l border-gray-100 p-1 ${isToday ? 'bg-blue-50/40' : ''}`}
                    >
                      {cellApts.map(apt => (
                        <div
                          key={apt.id}
                          className="rounded px-1.5 py-1 text-xs mb-0.5 cursor-pointer hover:opacity-90 bg-blue-100 text-blue-800"
                          title={apt.patient?.name}
                        >
                          <div className="font-medium truncate">{apt.patient?.name ?? 'Paciente'}</div>
                          <div className="text-blue-600 flex items-center gap-1">
                            {formatTime(apt.startsAt)}
                            <Badge
                              label={APPOINTMENT_STATUS_LABELS[apt.status]}
                              className={APPOINTMENT_STATUS_COLORS[apt.status]}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
