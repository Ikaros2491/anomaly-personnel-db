import { apiRequest } from './client'
import type { PendingPersonnelSubmission, PersonnelRecord, ScpSubmission } from '../types'

export function buildPersonnelRecord(submission: ScpSubmission, createdBy: string): PersonnelRecord {
  const designation = submission.designation.trim()
  const name = submission.name.trim()

  return {
    recordUid: crypto.randomUUID(),
    id: designation.toUpperCase(),
    name,
    aliases: [name, designation, designation.toUpperCase()],
    picture: submission.picture.trim() || undefined,
    createdBy,
    createdAt: new Date().toISOString(),
    isUserCreated: true,
    fields: [
      { label: 'SCP Designation', value: designation, minClearance: 1 },
      { label: 'Role / Position', value: submission.role.trim(), minClearance: 1 },
      { label: 'Physical Description', value: submission.physicalDescription.trim(), minClearance: 1 },
      { label: 'Anomalous Abilities', value: submission.anomalousAbilities.trim(), minClearance: 1 },
      {
        label: 'Containment Procedures (Defection)',
        value: submission.containmentProcedures.trim(),
        minClearance: 1,
      },
      { label: 'File Author', value: createdBy, minClearance: 1 },
    ],
  }
}

export async function searchPersonnelApi(query: string): Promise<PersonnelRecord | null> {
  const data = await apiRequest<{ record: PersonnelRecord | null }>(
    `/api/personnel/search?q=${encodeURIComponent(query)}`,
  )
  return data.record
}

export async function getPersonnelStatsApi() {
  return apiRequest<{ approvedUserCreated: number; pending: number }>('/api/personnel/stats')
}

export async function submitPersonnelApi(record: PersonnelRecord) {
  return apiRequest<{ ok: boolean; immediate: boolean }>('/api/personnel', {
    method: 'POST',
    body: JSON.stringify({ record }),
  })
}

export async function getPendingPersonnelApi(): Promise<PendingPersonnelSubmission[]> {
  const data = await apiRequest<{ submissions: PendingPersonnelSubmission[] }>(
    '/api/personnel/pending',
  )
  return data.submissions
}

export async function approvePersonnelApi(requestId: string) {
  return apiRequest('/api/personnel/pending/' + requestId + '/approve', { method: 'POST' })
}

export async function rejectPersonnelApi(requestId: string) {
  return apiRequest('/api/personnel/pending/' + requestId + '/reject', { method: 'POST' })
}

export async function deletePersonnelApi(recordUid: string) {
  return apiRequest('/api/personnel/' + recordUid, { method: 'DELETE' })
}

export async function isUserCreatedRecordApi(recordUid: string): Promise<boolean> {
  const data = await apiRequest<{ isUserCreated: boolean }>(
    `/api/personnel/${recordUid}/is-user-created`,
  )
  return data.isUserCreated
}
