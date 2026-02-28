import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './contexts/AuthContext'
import RequireAuth from './components/auth/RequireAuth'
import LoginPage from './pages/LoginPage'
import AccessDeniedPage from './pages/AccessDeniedPage'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import CadastroPage from './pages/CadastroPage'
import PatientDetailPage from './pages/PatientDetailPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ProfessionalsPage from './pages/ProfessionalsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import MyAppointmentsPage from './pages/MyAppointmentsPage'
import AppLayout from './components/layout/AppLayout'
import PatientPortalLayout from './components/layout/PatientPortalLayout'
import OnboardingPage from './pages/OnboardingPage'
import FinanceiroPage from './pages/FinanceiroPage'
import RelatoriosPage from './pages/RelatoriosPage'
import MeuPerfilPage from './pages/MeuPerfilPage'

function App() {
  const { session, profile, role, isSuperAdmin, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  // Signed-in but no profile yet (e.g. first OAuth login) — run onboarding
  if (!profile) {
    return <OnboardingPage />
  }

  // Patient role gets a lightweight portal layout
  if (role === 'patient') {
    return (
      <PatientPortalLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/minhas-consultas" replace />} />
          <Route path="/minhas-consultas" element={<MyAppointmentsPage />} />
          <Route path="/meu-perfil" element={<MeuPerfilPage />} />
          <Route path="/acesso-negado" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/minhas-consultas" replace />} />
        </Routes>
      </PatientPortalLayout>
    )
  }

  // Staff roles (admin, receptionist, professional)
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/pacientes"
          element={
            <RequireAuth permission="canViewPatients">
              <PatientsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pacientes/novo"
          element={
            <RequireAuth permission="canManagePatients">
              <CadastroPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <RequireAuth permission="canViewPatients">
              <PatientDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/pacientes/:id/editar"
          element={
            <RequireAuth permission="canManagePatients">
              <CadastroPage />
            </RequireAuth>
          }
        />
        <Route path="/agenda" element={<AppointmentsPage />} />
        <Route
          path="/financeiro"
          element={
            <RequireAuth permission="canViewFinancial">
              <FinanceiroPage />
            </RequireAuth>
          }
        />
        <Route
          path="/relatorios"
          element={
            <RequireAuth permission="canViewFinancial">
              <RelatoriosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profissionais"
          element={
            <RequireAuth permission="canManageProfessionals">
              <ProfessionalsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RequireAuth permission="canManageSettings">
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        {isSuperAdmin && <Route path="/admin" element={<AdminPage />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App
