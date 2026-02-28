import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { Appointment } from '../types'

function mapRow(row: Record<string, unknown>): Appointment {
  return {
    id:                row.id as string,
    clinicId:          row.clinic_id as string,
    patientId:         row.patient_id as string,
    professionalId:    row.professional_id as string,
    startsAt:          row.starts_at as string,
    endsAt:            row.ends_at as string,
    status:            row.status as Appointment['status'],
    notes:             (row.notes as string) ?? null,
    chargeAmountCents: (row.charge_amount_cents as number) ?? null,
    paidAmountCents:   (row.paid_amount_cents as number) ?? null,
    paidAt:            (row.paid_at as string) ?? null,
    createdAt:         row.created_at as string,
    patient:           row.patient as Appointment['patient'],
    professional:      row.professional as Appointment['professional'],
  }
}

export function useAppointmentsQuery(startsFrom: string, startsUntil: string) {
  return useQuery({
    queryKey: ['appointments', startsFrom, startsUntil],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, patient:patients(id,name,phone), professional:professionals(id,name,specialty)`)
        .gte('starts_at', startsFrom)
        .lte('starts_at', startsUntil)
        .order('starts_at')
      if (error) throw error
      return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
    },
  })
}

export interface AppointmentInput {
  patientId: string
  professionalId: string
  startsAt: string   // ISO UTC
  endsAt: string
  status: Appointment['status']
  notes?: string | null
  chargeAmountCents?: number | null
}

export function useAppointmentMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['appointments'] })

  const create = useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id:           input.patientId,
          professional_id:      input.professionalId,
          starts_at:            input.startsAt,
          ends_at:              input.endsAt,
          status:               input.status,
          notes:                input.notes ?? null,
          charge_amount_cents:  input.chargeAmountCents ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: AppointmentInput & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          patient_id:           input.patientId,
          professional_id:      input.professionalId,
          starts_at:            input.startsAt,
          ends_at:              input.endsAt,
          status:               input.status,
          notes:                input.notes ?? null,
          charge_amount_cents:  input.chargeAmountCents ?? null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapRow(data as Record<string, unknown>)
    },
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { create, update, cancel }
}
