import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import type { Appointment } from '../types'

function mapRow(row: Record<string, unknown>): Appointment {
  return {
    id:               row.id as string,
    clinicId:         row.clinic_id as string,
    patientId:        row.patient_id as string,
    professionalId:   row.professional_id as string,
    startsAt:         row.starts_at as string,
    endsAt:           row.ends_at as string,
    status:           row.status as Appointment['status'],
    notes:            (row.notes as string) ?? null,
    chargeAmountCents: (row.charge_amount_cents as number) ?? null,
    paidAmountCents:   (row.paid_amount_cents as number) ?? null,
    paidAt:           (row.paid_at as string) ?? null,
    createdAt:        row.created_at as string,
    patient:          row.patient as Appointment['patient'],
    professional:     row.professional as Appointment['professional'],
  }
}

/** Fetch appointments for a given date range (ISO strings) */
export function useAppointments(startsFrom: string, startsUntil: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone),
        professional:professionals(id, name, specialty)
      `)
      .gte('starts_at', startsFrom)
      .lte('starts_at', startsUntil)
      .order('starts_at')

    if (error) setError(error.message)
    else setAppointments((data ?? []).map(r => mapRow(r as Record<string, unknown>)))
    setLoading(false)
  }, [startsFrom, startsUntil])

  useEffect(() => { fetch() }, [fetch])

  return { appointments, loading, error, refetch: fetch }
}

/** Fetch appointments for a specific patient */
export function usePatientAppointments(patientId: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    supabase
      .from('appointments')
      .select(`*, professional:professionals(id, name, specialty)`)
      .eq('patient_id', patientId)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        setAppointments((data ?? []).map(r => mapRow(r as Record<string, unknown>)))
        setLoading(false)
      })
  }, [patientId])

  return { appointments, loading }
}
