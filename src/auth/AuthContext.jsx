import { createContext, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'

// ── Auth Context ─────────────────────────────────────────

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

// ── Returns the default home page for a role ─────────────
export function roleHome(role) {
  if (role === 'Station') return '/station'
  return '/dashboard' // CCO and Admin
}

// ── Route Guards ─────────────────────────────────────────

/** Redirects to /login if not authenticated */
export function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * Redirects to the role's home if the user's role is not in the allowed list.
 * @param {{ roles: string[], children: React.ReactNode }} props
 */
export function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />
  }
  return children
}
