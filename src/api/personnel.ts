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
    fields: buildScpFields(submission, createdBy),
  }
}

function buildScpFields(submission: ScpSubmission, fileAuthor: string) {
  const designation = submission.designation.trim()

  return [
    { label: 'SCP Designation', value: designation, minClearance: 1 as const },
    { label: 'Role / Position', value: submission.role.trim(), minClearance: 1 as const },
    { label: 'Physical Description', value: submission.physicalDescription.trim(), minClearance: 1 as const },
    { label: 'Anomalous Abilities', value: submission.anomalousAbilities.trim(), minClearance: 1 as const },
    {
      label: 'Containment Procedures (Defection)',
      value: submission.containmentProcedures.trim(),
      minClearance: 1 as const,
    },
    { label: 'File Author', value: fileAuthor, minClearance: 1 as const },
  ]
}

function getFieldValue(record: PersonnelRecord, label: string) {
  return record.fields.find((field) => field.label === label)?.value ?? ''
}

export function recordToScpSubmission(record: PersonnelRecord): ScpSubmission {
  return {
    designation: record.id,
    name: record.name,
    role: getFieldValue(record, 'Role / Position'),
    picture: record.picture ?? '',
    physicalDescription: getFieldValue(record, 'Physical Description'),
    anomalousAbilities: getFieldValue(record, 'Anomalous Abilities'),
    containmentProcedures: getFieldValue(record, 'Containment Procedures (Defection)'),
  }
}

export function buildUpdatedPersonnelRecord(
  submission: ScpSubmission,
  existing: PersonnelRecord,
): PersonnelRecord {
  const designation = submission.designation.trim()
  const name = submission.name.trim()
  const fileAuthor = existing.createdBy ?? getFieldValue(existing, 'File Author') ?? 'Unknown'

  return {
    recordUid: existing.recordUid,
    id: designation.toUpperCase(),
    name,
    aliases: [name, designation, designation.toUpperCase()],
    picture: submission.picture.trim() || undefined,
    createdBy: existing.createdBy,
    createdAt: existing.createdAt,
    isUserCreated: true,
    fields: buildScpFields(submission, fileAuthor),
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

export async function updatePersonnelApi(recordUid: string, record: PersonnelRecord) {
  const data = await apiRequest<{ ok: boolean; record: PersonnelRecord }>(
    '/api/personnel/' + recordUid,
    {
      method: 'PUT',
      body: JSON.stringify({ record }),
    },
  )
  return data.record
}

export async function isUserCreatedRecordApi(recordUid: string): Promise<boolean> {
  const data = await apiRequest<{ isUserCreated: boolean }>(
    `/api/personnel/${recordUid}/is-user-created`,
  )
  return data.isUserCreated
}
