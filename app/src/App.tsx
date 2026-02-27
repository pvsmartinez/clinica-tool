import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import CadastroPage from './pages/CadastroPage'
import PatientDetailPage from './pages/PatientDetailPage'
import AppointmentsPage from './pages/AppointmentsPage'
import AppLayout from './components/layout/AppLayout'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pacientes" element={<PatientsPage />} />
        <Route path="/pacientes/novo" element={<CadastroPage />} />
        <Route path="/pacientes/:id" element={<PatientDetailPage />} />
        <Route path="/pacientes/:id/editar" element={<CadastroPage />} />
        <Route path="/agenda" element={<AppointmentsPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
