import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { AvailabilitySlot } from '../types'

function mapRow(r: Record<string, unknown>): AvailabilitySlot {
  return {
    id:             r.id as string,
    clinicId:       r.clinic_id as string,
    professionalId: r.professional_id as string,
    weekday:        r.weekday as AvailabilitySlot['weekday'],
    startTime:      r.start_time as string,
    endTime:        r.end_time as string,
    active:         r.active as boolean,
  }
}

export function useAvailabilitySlots(professionalId: string) {
  const qc = useQueryClient()
  const key = ['availability-slots', professionalId]

  const query = useQuery({
    queryKey: key,
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('professional_id', professionalId)
        .order('weekday')
        .order('start_time')
      if (error) throw error
      return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
    },
  })

  const upsert = useMutation({
    mutationFn: async (slots: Omit<AvailabilitySlot, 'id' | 'clinicId'>[]) => {
      // Delete all existing for this professional then insert new set
      const { error: delError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('professional_id', professionalId)
      if (delError) throw delError

      if (slots.length === 0) return

      const { error: insError } = await supabase
        .from('availability_slots')
        .insert(
          slots.map(s => ({
            professional_id: professionalId,
            weekday:         s.weekday,
            start_time:      s.startTime,
            end_time:        s.endTime,
            active:          s.active,
          }))
        )
      if (insError) throw insError
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return { ...query, upsert }
}
