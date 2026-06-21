import { apiRequest } from './client'
import type { ClearanceLevel, ManagedOperator, SignupRequest } from '../types'

export async function getPendingSignupsApi(): Promise<SignupRequest[]> {
  const data = await apiRequest<{ requests: SignupRequest[] }>('/api/signups/pending')
  return data.requests
}

export async function approveSignupApi(requestId: string, clearance: ClearanceLevel) {
  return apiRequest('/api/signups/' + requestId + '/approve', {
    method: 'POST',
    body: JSON.stringify({ clearance }),
  })
}

export async function rejectSignupApi(requestId: string) {
  return apiRequest('/api/signups/' + requestId + '/reject', { method: 'POST' })
}

export async function getOperatorsApi(): Promise<ManagedOperator[]> {
  const data = await apiRequest<{ operators: ManagedOperator[] }>('/api/operators')
  return data.operators
}

export async function updateOperatorClearanceApi(username: string, clearance: ClearanceLevel) {
  return apiRequest('/api/operators/' + encodeURIComponent(username) + '/clearance', {
    method: 'PATCH',
    body: JSON.stringify({ clearance }),
  })
}

export async function setOperatorDeactivatedApi(username: string, deactivated: boolean) {
  return apiRequest('/api/operators/' + encodeURIComponent(username) + '/deactivate', {
    method: 'PATCH',
    body: JSON.stringify({ deactivated }),
  })
}

export async function deleteOperatorApi(username: string) {
  return apiRequest('/api/operators/' + encodeURIComponent(username), { method: 'DELETE' })
}
