import { apiRequest } from './client'
import type { ClearanceLevel, ManagedOperator } from '../types'

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

export async function setOperatorAdministratorApi(username: string, isAdministrator: boolean) {
  return apiRequest('/api/operators/' + encodeURIComponent(username) + '/administrator', {
    method: 'PATCH',
    body: JSON.stringify({ isAdministrator }),
  })
}

export async function setOperatorContainmentAccessApi(username: string, containmentAccess: boolean) {
  return apiRequest('/api/operators/' + encodeURIComponent(username) + '/containment-access', {
    method: 'PATCH',
    body: JSON.stringify({ containmentAccess }),
  })
}

export async function resetOperatorPasswordApi(username: string, password: string) {
  return apiRequest('/api/operators/' + encodeURIComponent(username) + '/password', {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  })
}
