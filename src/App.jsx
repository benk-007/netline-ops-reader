import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireAuth, RequireRole, useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FlightStatus from './pages/FlightStatus'
import Settings from './pages/Settings'
import AdminPanel from './pages/AdminPanel'
import StationView from './pages/StationView'
import './App.css'

/** Redirects to the correct home based on the current user's role */
function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'Station') return <Navigate to="/station" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected shell */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {/* Default redirect based on role */}
        <Route index element={<RoleRedirect />} />

        {/* CCO + Admin */}
        <Route
          path="dashboard"
          element={
            <RequireRole roles={['CCO', 'Admin']}>
              <Dashboard />
            </RequireRole>
          }
        />
        <Route
          path="status"
          element={
            <RequireRole roles={['CCO', 'Admin']}>
              <FlightStatus />
            </RequireRole>
          }
        />

        {/* Station Manager */}
        <Route
          path="station"
          element={
            <RequireRole roles={['Station']}>
              <StationView />
            </RequireRole>
          }
        />

        {/* Admin only */}
        <Route
          path="admin"
          element={
            <RequireRole roles={['Admin']}>
              <AdminPanel />
            </RequireRole>
          }
        />

        {/* All roles */}
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}
