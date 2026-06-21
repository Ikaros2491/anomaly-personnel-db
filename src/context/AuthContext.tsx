import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { authenticate } from '../data/mockDatabase'
import type { AuthSession } from '../types'

interface AuthContextValue {
  session: AuthSession | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: (username, password) => {
        const result = authenticate(username, password)
        if (!result) return false
        setSession(result)
        return true
      },
      logout: () => setSession(null),
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
