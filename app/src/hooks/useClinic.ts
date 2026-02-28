import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuthContext } from '../contexts/AuthContext'
import type { Clinic } from '../types'

function mapRow(r: Record<string, unknown>): Clinic {
  return {
    id:                    r.id as string,
    name:                  r.name as string,
    cnpj:                  (r.cnpj as string) ?? null,
    phone:                 (r.phone as string) ?? null,
    email:                 (r.email as string) ?? null,
    address:               (r.address as string) ?? null,
    city:                  (r.city as string) ?? null,
    state:                 (r.state as string) ?? null,
    slotDurationMinutes:   (r.slot_duration_minutes as number) ?? 30,
    workingHours:          (r.working_hours as Clinic['workingHours']) ?? {},
    customPatientFields:   (r.custom_patient_fields as Clinic['customPatientFields']) ?? [],
    createdAt:             r.created_at as string,
  }
}

export function useClinic() {
  const qc = useQueryClient()
  const { profile } = useAuthContext()
  const clinicId = profile?.clinicId

  const query = useQuery({
    queryKey: ['clinic', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId!)
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
  })

  const update = useMutation({
    mutationFn: async (input: Partial<Omit<Clinic, 'id' | 'createdAt'>>) => {
      const { data, error } = await supabase
        .from('clinics')
        .update({
          name:                   input.name,
          cnpj:                   input.cnpj,
          phone:                  input.phone,
          email:                  input.email,
          address:                input.address,
          city:                   input.city,
          state:                  input.state,
          slot_duration_minutes:  input.slotDurationMinutes,
          working_hours:          input.workingHours,
          custom_patient_fields:  input.customPatientFields,
        })
        .eq('id', clinicId!)
        .select()
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', clinicId] }),
  })

  return { ...query, update }
}
