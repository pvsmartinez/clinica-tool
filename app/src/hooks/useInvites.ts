import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { ClinicInvite, UserRole } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapInviteRow(r: Record<string, unknown>): ClinicInvite {
  const clinic = r.clinics as { name?: string } | null
  return {
    id:         r.id as string,
    clinicId:   r.clinic_id as string,
    clinicName: clinic?.name,
    email:      r.email as string,
    role:       r.role as UserRole,
    name:       (r.name as string) ?? null,
    invitedBy:  (r.invited_by as string) ?? null,
    usedAt:     (r.used_at as string) ?? null,
    createdAt:  r.created_at as string,
  }
}

// ─── useMyInvite ──────────────────────────────────────────────────────────────
// Checks clinic_invites for the authenticated user's email.
// Used during onboarding: if the user has a pending invite, show the "confirm
// access" view instead of the "no access" view.
export function useMyInvite(email: string | undefined) {
  return useQuery<ClinicInvite | null>({
    queryKey: ['myInvite', email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_invites')
        .select('*, clinics(name)')
        .is('used_at', null)
        .ilike('email', email!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapInviteRow(data as Record<string, unknown>)
    },
  })
}

// ─── usePendingInvites ────────────────────────────────────────────────────────
// Lists pending (not yet accepted) invites for the current user's clinic.
export function usePendingInvites() {
  return useQuery<ClinicInvite[]>({
    queryKey: ['pendingInvites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_invites')
        .select('*, clinics(name)')
        .is('used_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => mapInviteRow(r as Record<string, unknown>))
    },
  })
}

// ─── useClinicsPublic ─────────────────────────────────────────────────────────
// Returns all clinics for the patient registration dropdown.
// Available to any authenticated user (RLS "authenticated_read_clinics" policy).
export function useClinicsPublic() {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ['clinicsPublic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name')
        .order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string }[]
    },
  })
}

// ─── useCreateInvite ──────────────────────────────────────────────────────────
// Clinic admin creates an invite for a future professional/staff.
export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      email: string
      role?: UserRole
      name?: string
    }) => {
      const { data, error } = await supabase
        .from('clinic_invites')
        .insert({
          email: input.email.toLowerCase().trim(),
          role:  input.role ?? 'professional',
          name:  input.name ?? null,
        })
        .select('*, clinics(name)')
        .single()
      if (error) throw error
      return mapInviteRow(data as Record<string, unknown>)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingInvites'] }),
  })
}

// ─── useDeleteInvite ──────────────────────────────────────────────────────────
// Clinic admin revokes an invite.
export function useDeleteInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clinic_invites')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pendingInvites'] }),
  })
}

// ─── useAcceptInvite ──────────────────────────────────────────────────────────
// Called during onboarding when the user accepts a professional/staff invite.
// Creates the user_profiles row and marks the invite as used.
export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (params: {
      inviteId: string
      userId: string
      clinicId: string
      role: UserRole
      name: string
    }) => {
      // 1. Create user_profiles
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .insert({
          id:             params.userId,
          clinic_id:      params.clinicId,
          role:           params.role,
          name:           params.name.trim(),
          is_super_admin: false,
        })
      if (profileErr) throw new Error(profileErr.message)

      // 2. Mark invite as used
      const { error: inviteErr } = await supabase
        .from('clinic_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', params.inviteId)
      if (inviteErr) throw new Error(inviteErr.message)

      // 3. Refresh the session so AuthContext picks up the new profile
      await supabase.auth.refreshSession()
    },
  })
}
