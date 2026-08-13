import { apiRequest } from './client'
import type { ClearanceRequest, ClearanceRequestFormData } from '../types'

export async function submitClearanceRequestApi(form: ClearanceRequestFormData) {
  return apiRequest<{ ok: boolean; request: ClearanceRequest }>('/api/clearance-requests', {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

export async function getMyClearanceRequestApi(): Promise<ClearanceRequest | null> {
  const data = await apiRequest<{ request: ClearanceRequest | null }>('/api/clearance-requests/mine')
  return data.request
}

export async function getPendingClearanceRequestsApi(): Promise<ClearanceRequest[]> {
  const data = await apiRequest<{ requests: ClearanceRequest[] }>(
    '/api/clearance-requests/pending',
  )
  return data.requests
}

export async function approveClearanceRequestApi(id: string) {
  return apiRequest('/api/clearance-requests/' + id + '/approve', { method: 'POST' })
}

export async function rejectClearanceRequestApi(id: string) {
  return apiRequest('/api/clearance-requests/' + id + '/reject', { method: 'POST' })
}
