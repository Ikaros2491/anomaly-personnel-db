import { apiRequest, setStoredAuthToken } from './client'
import type { AuthSession } from '../types'

export async function loginApi(username: string, password: string): Promise<AuthSession> {
  const data = await apiRequest<{ session: AuthSession; token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  if (data.token) {
    setStoredAuthToken(data.token)
  }

  return data.session
}

export async function logoutApi(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' })
  } finally {
    setStoredAuthToken(null)
  }
}

export async function getMeApi(): Promise<AuthSession | null> {
  try {
    const data = await apiRequest<{ session: AuthSession }>('/api/auth/me')
    return data.session
  } catch {
    setStoredAuthToken(null)
    return null
  }
}

export async function submitSignupApi(
  username: string,
  password: string,
  displayName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Account creation failed.',
    }
  }
}
