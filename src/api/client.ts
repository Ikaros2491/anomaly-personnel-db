export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const AUTH_TOKEN_KEY = 'anorep_auth_token'

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // Private browsing / blocked storage — rely on in-memory session only.
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const token = getStoredAuthToken()
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}
