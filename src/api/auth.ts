import { apiRequest } from './client'
import type { AuthSession } from '../types'

export async function loginApi(username: string, password: string): Promise<AuthSession> {
  const data = await apiRequest<{ session: AuthSession }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return data.session
}

export async function logoutApi(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST' })
}

export async function getMeApi(): Promise<AuthSession | null> {
  try {
    const data = await apiRequest<{ session: AuthSession }>('/api/auth/me')
    return data.session
  } catch {
    return null
  }
}

export async function submitSignupApi(
  username: string,
  password: string,
  displayName: string,
  justification: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName, justification }),
    })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Sign-up request failed.',
    }
  }
}
