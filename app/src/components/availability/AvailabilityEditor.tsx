import { useState, useEffect } from 'react'
import { Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useAvailabilitySlots } from '../../hooks/useAvailabilitySlots'
import type { AvailabilitySlot } from '../../types'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

type DaySlot = { startTime: string; endTime: string }

interface Props {
  professionalId: string
  /** Pass when the logged-in user is a professional editing their own availability
   *  from a specific clinic context (multi-clinic scenario). */
  clinicId?: string
  /** Label for the "add interval" button. Defaults to '+ horário'. */
  addSlotLabel?: string
}

/**
 * Shared schedule editor used by both DisponibilidadeTab (admin view, picks any prof)
 * and MinhaDisponibilidadePage (professional self-service view).
 */
export default function AvailabilityEditor({
  professionalId,
  clinicId,
  addSlotLabel = '+ horário',
}: Props) {
  const { data: slots = [], isLoading: loadingSlots, upsert } = useAvailabilitySlots(
    professionalId,
    clinicId,
  )

  const [schedule, setSchedule] = useState<Partial<Record<number, DaySlot[]>>>({})
  const [saving, setSaving] = useState(false)

  // Sync schedule state when server data (or selected professional) changes
  useEffect(() => {
    if (!slots.length) { setSchedule({}); return }
    const map: Partial<Record<number, DaySlot[]>> = {}
    for (const s of slots) {
      if (!map[s.weekday]) map[s.weekday] = []
      map[s.weekday]!.push({ startTime: s.startTime, endTime: s.endTime })
    }
    setSchedule(map)
  }, [slots])

  function toggleDay(day: number) {
    setSchedule(prev => {
      const next = { ...prev }
      if (next[day]) delete next[day]
      else next[day] = [{ startTime: '08:00', endTime: '18:00' }]
      return next
    })
  }

  function updateSlot(day: number, idx: number, field: 'startTime' | 'endTime', value: string) {
    setSchedule(prev => {
      const daySlots = [...(prev[day] ?? [])]
      daySlots[idx] = { ...daySlots[idx], [field]: value }
      return { ...prev, [day]: daySlots }
    })
  }

  function addSlot(day: number) {
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { startTime: '13:00', endTime: '17:00' }],
    }))
  }

  function removeSlot(day: number, idx: number) {
    setSchedule(prev => {
      const daySlots = (prev[day] ?? []).filter((_, i) => i !== idx)
      if (daySlots.length === 0) {
        const next = { ...prev }
        delete next[day]
        return next
      }
      return { ...prev, [day]: daySlots }
    })
  }

  async function save() {
    if (!professionalId) return
    setSaving(true)
    try {
      const newSlots: Omit<AvailabilitySlot, 'id' | 'clinicId'>[] = []
      for (const [dayStr, daySlots] of Object.entries(schedule)) {
        for (const s of daySlots ?? []) {
          newSlots.push({
            professionalId,
            weekday:   Number(dayStr) as AvailabilitySlot['weekday'],
            startTime: s.startTime,
            endTime:   s.endTime,
            active:    true,
          })
        }
      }
      await upsert.mutateAsync(newSlots)
      toast.success('Disponibilidade salva')
    } catch {
      toast.error('Erro ao salvar disponibilidade')
    } finally {
      setSaving(false)
    }
  }

  if (loadingSlots) {
    return <p className="text-sm text-gray-400">Carregando disponibilidade...</p>
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {([0, 1, 2, 3, 4, 5, 6] as const).map(day => {
          const daySlots = schedule[day]
          const active = !!daySlots && daySlots.length > 0
          return (
            <div key={day} className="border border-gray-200 rounded-xl p-3 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleDay(day)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 w-8">{WEEKDAY_LABELS[day]}</span>
                </label>
                {active && (
                  <button
                    type="button"
                    onClick={() => addSlot(day)}
                    className="text-xs text-blue-600 hover:underline ml-auto"
                  >
                    {addSlotLabel}
                  </button>
                )}
              </div>
              {active && daySlots?.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 ml-7 mb-1.5">
                  <input
                    type="time"
                    value={s.startTime}
                    onChange={e => updateSlot(day, idx, 'startTime', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400 text-xs">até</span>
                  <input
                    type="time"
                    value={s.endTime}
                    onChange={e => updateSlot(day, idx, 'endTime', e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                  />
                  {daySlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(day, idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash size={13} />
                    </button>
                  )}
                </div>
              ))}
              {!active && (
                <p className="text-xs text-gray-300 ml-7">Não disponível</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !professionalId}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? 'Salvando...' : 'Salvar disponibilidade'}
        </button>
      </div>
    </div>
  )
}
