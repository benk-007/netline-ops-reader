import { createContext, useContext, useState, useEffect } from 'react'

// ── Default colour palette ────────────────────────────────
export const DEFAULT_COLORS = {
  // Gantt scheduled bar (top / only bar when on-time)
  scheduled: '#1D4ED8',
  // Gantt actual bar colours per service type
  J: '#A0AEC0',
  F: '#FCA5A5',
  P: '#166534',
  O: '#4ADE80',
  // Single-bar service types
  S: '#38BDF8',
  Z: '#FEF08A',
  // UI chrome
  sidebarBg: '#1e293b',
  topbarBg:  '#ffffff',
}

const LS_KEY = 'netline_app_config'

const AppConfigContext = createContext(null)

export function AppConfigProvider({ children }) {
  const [colors, setColorsState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      return { ...DEFAULT_COLORS, ...saved }
    } catch {
      return DEFAULT_COLORS
    }
  })

  // Keep CSS variables in sync whenever colours change
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-bg', colors.sidebarBg)
    document.documentElement.style.setProperty('--topbar-bg',  colors.topbarBg)
  }, [colors.sidebarBg, colors.topbarBg])

  function setColors(next) {
    setColorsState(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }

  function updateColor(key, value) {
    setColors({ ...colors, [key]: value })
  }

  function resetColors() {
    setColors(DEFAULT_COLORS)
  }

  return (
    <AppConfigContext.Provider value={{ colors, setColors, updateColor, resetColors, DEFAULT_COLORS }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  return useContext(AppConfigContext)
}
