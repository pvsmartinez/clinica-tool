import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { Professional } from '../types'

function mapRow(r: Record<string, unknown>): Professional {
  return {
    id:          r.id as string,
    clinicId:    r.clinic_id as string,
    name:        r.name as string,
    specialty:   (r.specialty as string) ?? null,
    councilId:   (r.council_id as string) ?? null,
    phone:       (r.phone as string) ?? null,
    email:       (r.email as string) ?? null,
    active:      r.active as boolean,
    createdAt:   r.created_at as string,
  }
}

export function useProfessionals() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
    },
  })

  const create = useMutation({
    mutationFn: async (input: Omit<Professional, 'id' | 'clinicId' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('professionals')
        .insert({
          name:       input.name,
          specialty:  input.specialty,
          council_id: input.councilId,
          phone:      input.phone,
          email:      input.email,
          active:     input.active,
        })
        .select()
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Professional> & { id: string }) => {
      const { data, error } = await supabase
        .from('professionals')
        .update({
          name:       input.name,
          specialty:  input.specialty,
          council_id: input.councilId,
          phone:      input.phone,
          email:      input.email,
          active:     input.active,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('professionals')
        .update({ active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professionals'] }),
  })

  return { ...query, create, update, toggleActive }
}
