import { createContext, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'

// ── Auth Context ────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const stored = localStorage.getItem('ram_user')
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null)

  function login(data) {
    localStorage.setItem('ram_user', JSON.stringify(data))
    setUser(data)
  }

  function logout() {
    localStorage.removeItem('ram_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// ── Protected Route ─────────────────────────────────────────────────────────

export function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}
