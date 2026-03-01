import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuthContext } from '../contexts/AuthContext'
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

export function useAvailabilitySlots(professionalId: string, clinicIdOverride?: string) {
  const qc = useQueryClient()
  const { profile } = useAuthContext()
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
      // Fetch existing IDs BEFORE modifying anything.
      // Strategy: insert new first → if that fails, old slots remain intact.
      // Then delete by the pre-fetched IDs → if that fails we have duplicates
      // but never a "zero availability" window.
      const { data: existing } = await supabase
        .from('availability_slots')
        .select('id')
        .eq('professional_id', professionalId)
      const existingIds = (existing ?? []).map(r => r.id as string)

      if (slots.length > 0) {
        const { error: insError } = await supabase
          .from('availability_slots')
          .insert(
            slots.map(s => ({
              clinic_id:       clinicIdOverride ?? profile!.clinicId!,
              professional_id: professionalId,
              weekday:         s.weekday,
              start_time:      s.startTime,
              end_time:        s.endTime,
              active:          s.active,
            }))
          )
        if (insError) throw insError
      }

      // Only delete old records after new ones are safely inserted
      if (existingIds.length > 0) {
        const { error: delError } = await supabase
          .from('availability_slots')
          .delete()
          .in('id', existingIds)
        if (delError) throw delError
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return { ...query, upsert }
}
