import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { PageLoader } from '../components/ui/PageLoader'

const LoginPage        = lazy(() => import('../pages/LoginPage'))
const CadastroClinicaPage = lazy(() => import('../pages/CadastroClinicaPage'))

export default function PublicRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/cadastro-clinica" element={<CadastroClinicaPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Suspense>
  )
}
