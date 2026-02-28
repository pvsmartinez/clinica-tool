import { NavLink, Navigate } from 'react-router-dom'
import { Stethoscope, SignOut, CalendarBlank, User } from '@phosphor-icons/react'
import { useAuthContext } from '../../contexts/AuthContext'

interface PatientPortalLayoutProps {
  children: React.ReactNode
}

/**
 * Simplified layout for the patient role.
 * Shows only: own appointments and own profile.
 */
export default function PatientPortalLayout({ children }: PatientPortalLayoutProps) {
  const { role, profile, signOut, loading } = useAuthContext()

  if (loading) return null
  if (!role) return <Navigate to="/login" replace />
  if (role !== 'patient') return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope size={20} className="text-blue-600" />
          <span className="font-semibold text-gray-800 text-sm">Clínica Tool</span>
        </div>
        <div className="flex items-center gap-4">
          <NavLink
            to="/minhas-consultas"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-xs transition ${
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <CalendarBlank size={14} /> Consultas
          </NavLink>
          <NavLink
            to="/meu-perfil"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-xs transition ${
                isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <User size={14} /> Meu Perfil
          </NavLink>
          <span className="text-sm text-gray-500">{profile?.name}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            <SignOut size={15} />
            Sair
          </button>
        </div>
      </header>

      {/* Page */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
