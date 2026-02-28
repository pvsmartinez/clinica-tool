import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import type { UserProfile, UserRole } from '../types'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (key: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, clinic_id, role, name')
    .eq('id', userId)
    .single()
  if (!data) return null
  return {
    id: data.id as string,
    clinicId: data.clinic_id as string,
    role: data.role as UserRole,
    name: data.name as string,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) setProfile(await fetchProfile(session.user.id))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setProfile(session ? await fetchProfile(session.user.id) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }).then(() => undefined)

  const signInWithFacebook = () =>
    supabase.auth.signInWithOAuth({ provider: 'facebook', options: { redirectTo: window.location.origin } }).then(() => undefined)

  const signInWithApple = () =>
    supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin } }).then(() => undefined)

  const signOut = () => supabase.auth.signOut().then(() => undefined)

  const hasPermission = (key: string): boolean => {
    if (!profile) return false
    const map: Record<string, Record<string, boolean>> = {
      admin: { canManagePatients: true, canManageAgenda: true, canManageProfessionals: true, canViewFinancial: true, canManageSettings: true },
      receptionist: { canManagePatients: true, canManageAgenda: true, canManageProfessionals: false, canViewFinancial: false, canManageSettings: false },
      professional: { canManagePatients: false, canManageAgenda: true, canManageProfessionals: false, canViewFinancial: false, canManageSettings: false },
      patient: { canManagePatients: false, canManageAgenda: false, canManageProfessionals: false, canViewFinancial: false, canManageSettings: false },
    }
    return map[profile.role]?.[key] ?? false
  }

  return (
    <AuthContext.Provider value={{
      session, profile, role: profile?.role ?? null, loading,
      signInWithEmail, signInWithGoogle, signInWithFacebook, signInWithApple, signOut, hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
