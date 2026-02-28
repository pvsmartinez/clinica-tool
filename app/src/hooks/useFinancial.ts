import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '../services/supabase'
import type { Appointment } from '../types'

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export interface FinancialRow extends Appointment {
  patient?: { id: string; name: string; phone: string | null }
  professional?: { id: string; name: string; specialty: string | null }
}

function mapRow(row: Record<string, unknown>): FinancialRow {
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
    patient:           row.patient as FinancialRow['patient'],
    professional:      row.professional as FinancialRow['professional'],
  }
}

export function useFinancial(month: Date) {
  const monthStart = startOfMonth(month).toISOString()
  const monthEnd   = endOfMonth(month).toISOString()

  return useQuery({
    queryKey: ['financial', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, phone),
          professional:professionals(id, name, specialty)
        `)
        .gte('starts_at', monthStart)
        .lte('starts_at', monthEnd)
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .order('starts_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => mapRow(r as Record<string, unknown>))
    },
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      paidAmountCents,
    }: {
      id: string
      paidAmountCents: number
    }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          paid_amount_cents: paidAmountCents,
          paid_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}
