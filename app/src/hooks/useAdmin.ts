import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { Clinic, UserRole } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AdminUserProfile {
  id: string
  name: string
  role: UserRole
  clinicId: string | null
  clinicName: string | null
  isSuperAdmin: boolean
}

// ─── All clinics (no RLS filter — super admin sees everything) ─────────────────
export function useAdminClinics() {
  return useQuery({
    queryKey: ['admin', 'clinics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => ({
        id:                   r.id as string,
        name:                 r.name as string,
        cnpj:                 r.cnpj as string | null,
        phone:                r.phone as string | null,
        email:                r.email as string | null,
        address:              r.address as string | null,
        city:                 r.city as string | null,
        state:                r.state as string | null,
        slotDurationMinutes:  (r.slot_duration_minutes as number) ?? 30,
        workingHours:         r.working_hours ?? {},
        customPatientFields:  r.custom_patient_fields ?? [],
        createdAt:            r.created_at as string,
      } satisfies Clinic))
    },
  })
}

// ─── Create clinic ────────────────────────────────────────────────────────────
export function useCreateClinic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; cnpj?: string; phone?: string; email?: string; city?: string; state?: string }) => {
      const { data, error } = await supabase
        .from('clinics')
        .insert({ name: input.name, cnpj: input.cnpj || null, phone: input.phone || null,
                  email: input.email || null, city: input.city || null, state: input.state || null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'clinics'] }),
  })
}

// ─── All user profiles (only visible to super admin via RLS) ──────────────────
export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('id, name, role, clinic_id, is_super_admin')
        .order('name')
      if (error) throw error

      const clinicIds = [...new Set(profiles?.map(p => p.clinic_id).filter(Boolean))]
      let clinicNames: Record<string, string> = {}
      if (clinicIds.length > 0) {
        const { data: clinics } = await supabase
          .from('clinics').select('id, name').in('id', clinicIds as string[])
        clinicNames = Object.fromEntries((clinics ?? []).map(c => [c.id, c.name as string]))
      }

      return (profiles ?? []).map(p => ({
        id:          p.id as string,
        name:        p.name as string,
        role:        p.role as UserRole,
        clinicId:    p.clinic_id as string | null,
        clinicName:  p.clinic_id ? (clinicNames[p.clinic_id] ?? 'Clínica desconhecida') : null,
        isSuperAdmin: (p.is_super_admin as boolean) ?? false,
      } satisfies AdminUserProfile))
    },
  })
}

// ─── Upsert a user profile (assign to clinic + role) ─────────────────────────
export function useUpsertProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; name: string; role: UserRole; clinicId: string | null; isSuperAdmin: boolean }) => {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: input.id,
          name: input.name,
          role: input.role,
          clinic_id: input.clinicId,
          is_super_admin: input.isSuperAdmin,
        })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'profiles'] }),
  })
}

// ─── Admin overview — aggregate stats across ALL clinics ──────────────────────
export interface ClinicStats {
  clinicId: string
  clinicName: string
  patients: number
  professionals: number
  appointmentsThisMonth: number
  appointmentsTotal: number
}

export interface AdminOverview {
  totalClinics: number
  totalUsers: number
  totalPatients: number
  totalAppointments: number
  perClinic: ClinicStats[]
}

export function useAdminOverview() {
  return useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const [
        { data: clinics,       error: e1 },
        { count: totalUsers,   error: e2 },
        { count: totalPatients, error: e3 },
        { count: totalAppts,   error: e4 },
        { data: patientsPC,    error: e5 },
        { data: profsPC,       error: e6 },
        { data: apptsMonth,    error: e7 },
        { data: apptsTotal,    error: e8 },
      ] = await Promise.all([
        supabase.from('clinics').select('id, name').order('name'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('patients').select('clinic_id'),
        supabase.from('professionals').select('clinic_id').eq('active', true),
        supabase.from('appointments').select('clinic_id').gte('starts_at', monthStart).lte('starts_at', monthEnd),
        supabase.from('appointments').select('clinic_id'),
      ])

      for (const err of [e1, e2, e3, e4, e5, e6, e7, e8]) {
        if (err) throw err
      }

      // Count per clinic
      const count = (rows: { clinic_id: string }[] | null, id: string) =>
        (rows ?? []).filter(r => r.clinic_id === id).length

      const perClinic: ClinicStats[] = (clinics ?? []).map(c => ({
        clinicId:             c.id as string,
        clinicName:           c.name as string,
        patients:             count(patientsPC as { clinic_id: string }[], c.id as string),
        professionals:        count(profsPC    as { clinic_id: string }[], c.id as string),
        appointmentsThisMonth: count(apptsMonth as { clinic_id: string }[], c.id as string),
        appointmentsTotal:    count(apptsTotal  as { clinic_id: string }[], c.id as string),
      }))

      return {
        totalClinics:      (clinics ?? []).length,
        totalUsers:        totalUsers ?? 0,
        totalPatients:     totalPatients ?? 0,
        totalAppointments: totalAppts ?? 0,
        perClinic,
      }
    },
  })
}
