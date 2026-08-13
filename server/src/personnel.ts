import type { PersonnelRecord as DbPersonnel } from '@prisma/client'
import { randomUUID } from 'crypto'
import type { SessionPayload } from './auth.js'

export const CONTAINMENT_PROCEDURES_FIELD_LABEL = 'Containment Procedures (Defection)'
export const DEEP_ACCESS_REDACTION = '[REDACTED — DEEP ACCESS REQUIRED]'

const DEEP_ACCESS_FIELD_LABELS = new Set([
  CONTAINMENT_PROCEDURES_FIELD_LABEL,
  'Containment Notes',
  'How to Terminate / Contain', // legacy records
])

export interface PersonnelFieldDto {
  label: string
  value: string
  minClearance: number
  requiresDeepAccess?: boolean
  redacted?: boolean
}

export interface PersonnelRecordDto {
  recordUid?: string
  id: string
  name: string
  aliases: string[]
  picture?: string
  fields: PersonnelFieldDto[]
  createdBy?: string
  createdAt?: string
  isUserCreated?: boolean
}

export function canViewDeepAccess(session: Pick<SessionPayload, 'isAdministrator' | 'deepAccess'>) {
  return session.isAdministrator || session.deepAccess
}

function isDeepAccessField(field: PersonnelFieldDto) {
  return Boolean(field.requiresDeepAccess) || DEEP_ACCESS_FIELD_LABELS.has(field.label)
}

export function sanitizePersonnelForViewer(
  record: PersonnelRecordDto,
  session: Pick<SessionPayload, 'isAdministrator' | 'deepAccess'>,
): PersonnelRecordDto {
  if (canViewDeepAccess(session)) return record

  return {
    ...record,
    fields: record.fields.map((field) => {
      if (!isDeepAccessField(field)) return field

      return {
        ...field,
        requiresDeepAccess: true,
        value: DEEP_ACCESS_REDACTION,
        redacted: true,
      }
    }),
  }
}

export function rowToPersonnel(row: DbPersonnel): PersonnelRecordDto {
  return {
    recordUid: row.recordUid,
    id: row.designation,
    name: row.name,
    aliases: JSON.parse(row.aliasesJson),
    picture: row.picture ?? undefined,
    fields: JSON.parse(row.fieldsJson),
    createdBy: row.createdBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    isUserCreated: row.isUserCreated,
  }
}

export function personnelToRowData(record: PersonnelRecordDto, opts?: { isBuiltin?: boolean }) {
  return {
    recordUid: record.recordUid ?? randomUUID(),
    designation: record.id,
    name: record.name,
    aliasesJson: JSON.stringify(record.aliases),
    picture: record.picture ?? null,
    fieldsJson: JSON.stringify(record.fields),
    createdBy: record.createdBy ?? null,
    isUserCreated: record.isUserCreated ?? false,
    isBuiltin: opts?.isBuiltin ?? false,
  }
}

export function findInRecords(records: PersonnelRecordDto[], query: string): PersonnelRecordDto | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null

  return (
    records.find((record) => {
      const nameMatch = record.name.toLowerCase().includes(normalized)
      const aliasMatch = record.aliases.some((alias) => alias.toLowerCase().includes(normalized))
      const idMatch = record.id.toLowerCase() === normalized
      return nameMatch || aliasMatch || idMatch
    }) ?? null
  )
}
