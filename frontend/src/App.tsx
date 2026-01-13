import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CertificatesPage from './pages/CertificatesPage'
import CertificateDetailPage from './pages/CertificateDetailPage'
import CreateCertificatePage from './pages/CreateCertificatePage'
import VerifyPage from './pages/VerifyPage'
import PublicVerifyPage from './pages/PublicVerifyPage'
import UniversitiesPage from './pages/UniversitiesPage'
import CompaniesPage from './pages/CompaniesPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import WhitelistPage from './pages/WhitelistPage'
import ApplicationsPage from './pages/ApplicationsPage'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/verify/:code" element={<PublicVerifyPage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/certificates/new" element={<CreateCertificatePage />} />
        <Route path="/certificates/:id" element={<CertificateDetailPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/universities" element={<UniversitiesPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />

        {/* Admin Only Routes */}
        <Route path="/users" element={
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        } />
        <Route path="/whitelist" element={
          <AdminRoute>
            <WhitelistPage />
          </AdminRoute>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
