import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import type { Patient, PatientInput } from '../types'

// Map snake_case DB row → camelCase Patient
function mapRow(row: Record<string, unknown>): Patient {
  return {
    id:                   row.id as string,
    clinicId:             row.clinic_id as string,
    name:                 row.name as string,
    cpf:                  (row.cpf as string) ?? null,
    rg:                   (row.rg as string) ?? null,
    birthDate:            (row.birth_date as string) ?? null,
    sex:                  (row.sex as Patient['sex']) ?? null,
    phone:                (row.phone as string) ?? null,
    email:                (row.email as string) ?? null,
    addressStreet:        (row.address_street as string) ?? null,
    addressNumber:        (row.address_number as string) ?? null,
    addressComplement:    (row.address_complement as string) ?? null,
    addressNeighborhood:  (row.address_neighborhood as string) ?? null,
    addressCity:          (row.address_city as string) ?? null,
    addressState:         (row.address_state as string) ?? null,
    addressZip:           (row.address_zip as string) ?? null,
    notes:                (row.notes as string) ?? null,
    customFields:         (row.custom_fields as Record<string, unknown>) ?? {},
    createdAt:            row.created_at as string,
  }
}

// Map camelCase PatientInput → snake_case for DB
function mapInput(input: PatientInput) {
  return {
    name:                 input.name,
    cpf:                  input.cpf,
    rg:                   input.rg,
    birth_date:           input.birthDate,
    sex:                  input.sex,
    phone:                input.phone,
    email:                input.email,
    address_street:       input.addressStreet,
    address_number:       input.addressNumber,
    address_complement:   input.addressComplement,
    address_neighborhood: input.addressNeighborhood,
    address_city:         input.addressCity,
    address_state:        input.addressState,
    address_zip:          input.addressZip,
    notes:                input.notes,
    custom_fields:        input.customFields,
  }
}

export function usePatients(search = '') {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('patients')
      .select('*')
      .order('name')

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setPatients((data ?? []).map(mapRow))
    }
    setLoading(false)
  }, [search])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const createPatient = async (input: PatientInput): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .insert(mapInput(input))
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapRow(data as Record<string, unknown>)
  }

  const updatePatient = async (id: string, input: Partial<PatientInput>): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .update(mapInput(input as PatientInput))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapRow(data as Record<string, unknown>)
  }

  return { patients, loading, error, refetch: fetchPatients, createPatient, updatePatient }
}

export function usePatient(id: string) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    else setPatient(mapRow(data as Record<string, unknown>))
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { patient, loading, error, refetch: fetch }
}
