import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMeApi, loginApi, logoutApi } from '../api/auth'
import { ApiError } from '../api/client'
import type { AuthSession } from '../types'

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; deactivated?: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMeApi()
      .then((me) => setSession(me))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await loginApi(username, password)
      setSession(result)
      return { ok: true as const }
    } catch (error) {
      const deactivated = error instanceof ApiError && Boolean(
        (error.data as { deactivated?: boolean } | undefined)?.deactivated,
      )

      return {
        ok: false as const,
        deactivated,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, login, logout }),
    [session, loading, login, logout],
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
