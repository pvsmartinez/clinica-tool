import { NavLink } from 'react-router-dom'
import {
  CalendarBlank,
  Users,
  ChartBar,
  Stethoscope,
  SignOut,
} from '@phosphor-icons/react'
import { useAuthContext } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: ChartBar, label: 'Dashboard', permission: null },
  { to: '/agenda', icon: CalendarBlank, label: 'Agenda', permission: null },
  { to: '/pacientes', icon: Users, label: 'Pacientes', permission: 'canViewPatients' as const },
]

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { signOut, hasPermission, profile } = useAuthContext()

  const visibleNav = navItems.filter(item =>
    item.permission == null || hasPermission(item.permission)
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <Stethoscope size={24} className="text-blue-600" />
          <span className="font-semibold text-gray-800">Clínica Tool</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="p-3 border-t border-gray-200 space-y-1">
          {profile && (
            <p className="px-3 py-1 text-xs text-gray-400 truncate">{profile.name}</p>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <SignOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
