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
