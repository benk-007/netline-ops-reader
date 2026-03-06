import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FlightStatus from './pages/FlightStatus'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    airport: 'ALL',
    flight: '',
  })

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all wrapped in Layout shell */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout filters={filters} onFilterChange={setFilters} />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard filters={filters} />} />
            <Route path="status" element={<FlightStatus />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
