import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { PageLoader } from '../components/ui/PageLoader'

const MyAppointmentsPage = lazy(() => import('../pages/MyAppointmentsPage'))
const AgendarConsultaPage = lazy(() => import('../pages/AgendarConsultaPage'))
const MeuPerfilPage      = lazy(() => import('../pages/MeuPerfilPage'))
const AccessDeniedPage   = lazy(() => import('../pages/AccessDeniedPage'))

export default function PatientRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/minhas-consultas" replace />} />
        <Route path="/minhas-consultas" element={<MyAppointmentsPage />} />
        <Route path="/agendar" element={<AgendarConsultaPage />} />
        <Route path="/meu-perfil" element={<MeuPerfilPage />} />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        <Route path="*" element={<Navigate to="/minhas-consultas" replace />} />
      </Routes>
    </Suspense>
  )
}
