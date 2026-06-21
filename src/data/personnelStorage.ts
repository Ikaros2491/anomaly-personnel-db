import type { PendingPersonnelSubmission, PersonnelRecord, ScpSubmission } from '../types'

const APPROVED_KEY = 'anorep-approved-personnel'
const PENDING_KEY = 'anorep-pending-personnel'
const LEGACY_KEY = 'anorep-user-personnel'
const PICTURE_KEY_PREFIX = 'anorep-picture-'

function migrateLegacyPersonnel() {
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (!legacy || localStorage.getItem(APPROVED_KEY)) return

  localStorage.setItem(APPROVED_KEY, legacy)
  localStorage.removeItem(LEGACY_KEY)
}

function normalizeToArray<T>(parsed: unknown): T[] {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') return [parsed as T]
  return []
}

function ensureRecordUid(record: PersonnelRecord): PersonnelRecord & { recordUid: string } {
  if (record.recordUid) return record as PersonnelRecord & { recordUid: string }
  return { ...record, recordUid: crypto.randomUUID() }
}

function personnelRecordsMatch(stored: PersonnelRecord, candidate: PersonnelRecord): boolean {
  if (stored.recordUid && candidate.recordUid && stored.recordUid === candidate.recordUid) {
    return true
  }

  return (
    stored.id.toLowerCase() === candidate.id.toLowerCase() &&
    stored.name.toLowerCase() === candidate.name.toLowerCase()
  )
}

function pictureStorageKey(recordUid: string) {
  return `${PICTURE_KEY_PREFIX}${recordUid}`
}

function saveJson<T>(key: string, items: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

function savePicture(recordUid: string, picture: string) {
  try {
    localStorage.setItem(pictureStorageKey(recordUid), picture)
  } catch {
    // Picture too large for storage — file will load without persisted image
  }
}

function loadPicture(recordUid: string): string | undefined {
  return localStorage.getItem(pictureStorageKey(recordUid)) ?? undefined
}

function deletePicture(recordUid: string) {
  localStorage.removeItem(pictureStorageKey(recordUid))
}

function stripPictureForStorage(record: PersonnelRecord): PersonnelRecord {
  const normalized = ensureRecordUid(record)
  if (normalized.picture?.startsWith('data:') || normalized.picture?.startsWith('http')) {
    savePicture(normalized.recordUid, normalized.picture)
  }
  const { picture: _picture, ...withoutPicture } = normalized
  return withoutPicture
}

function hydratePicture(record: PersonnelRecord): PersonnelRecord {
  const normalized = ensureRecordUid(record)
  if (normalized.picture) return normalized
  const stored = loadPicture(normalized.recordUid)
  return stored ? { ...normalized, picture: stored } : normalized
}

function loadJson<T>(key: string): T[] {
  migrateLegacyPersonnel()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return normalizeToArray<T>(JSON.parse(raw))
  } catch {
    return []
  }
}

function loadApprovedRecordsFromStorage(): PersonnelRecord[] {
  const raw = loadJson<PersonnelRecord>(APPROVED_KEY)
  const withUids = raw.map(ensureRecordUid)

  if (raw.some((record) => !record.recordUid)) {
    saveJson(APPROVED_KEY, withUids)
  }

  return withUids
}

function loadPendingFromStorage(): PendingPersonnelSubmission[] {
  return loadJson<PendingPersonnelSubmission>(PENDING_KEY)
    .filter((submission) => Boolean(submission?.record?.id && submission?.record?.name))
    .map((submission) => ({
      ...submission,
      record: ensureRecordUid(submission.record),
    }))
}

export function loadApprovedPersonnel(): PersonnelRecord[] {
  return loadApprovedRecordsFromStorage().map(hydratePicture)
}

export function loadPendingPersonnel(): PendingPersonnelSubmission[] {
  return loadPendingFromStorage().map((submission) => ({
    ...submission,
    record: hydratePicture(submission.record),
  }))
}

export function getApprovedPersonnelCount(): number {
  return loadApprovedRecordsFromStorage().length
}

export function getPendingPersonnelCount(): number {
  return loadPendingFromStorage().length
}

function saveApprovedRecords(records: PersonnelRecord[]) {
  const stripped = records.map(stripPictureForStorage)
  saveJson(APPROVED_KEY, stripped)
}

function savePendingSubmissions(submissions: PendingPersonnelSubmission[]) {
  const stripped = submissions.map((submission) => ({
    ...submission,
    record: stripPictureForStorage(submission.record),
  }))
  saveJson(PENDING_KEY, stripped)
}

export function addApprovedPersonnel(record: PersonnelRecord) {
  const normalized = ensureRecordUid(record)
  const existing = loadApprovedRecordsFromStorage()
  const withoutDuplicate = existing.filter((item) => item.recordUid !== normalized.recordUid)
  withoutDuplicate.unshift(normalized)
  saveApprovedRecords(withoutDuplicate)
  return hydratePicture(normalized)
}

export function submitPersonnelForApproval(
  record: PersonnelRecord,
  submittedBy: string,
): PendingPersonnelSubmission {
  const submission: PendingPersonnelSubmission = {
    requestId: crypto.randomUUID(),
    record: ensureRecordUid(record),
    submittedBy,
    submittedAt: new Date().toISOString(),
  }

  const pending = loadPendingFromStorage()
  pending.unshift(submission)
  savePendingSubmissions(pending)
  return { ...submission, record: hydratePicture(submission.record) }
}

export function approvePersonnelSubmission(requestId: string): PersonnelRecord | null {
  const pending = loadPendingFromStorage()
  const index = pending.findIndex((s) => s.requestId === requestId)
  if (index === -1) return null

  const [submission] = pending.splice(index, 1)
  savePendingSubmissions(pending)
  return addApprovedPersonnel(hydratePicture(submission.record))
}

export function rejectPersonnelSubmission(requestId: string): boolean {
  const pending = loadPendingFromStorage()
  const submission = pending.find((s) => s.requestId === requestId)
  if (!submission) return false

  const filtered = pending.filter((s) => s.requestId !== requestId)
  savePendingSubmissions(filtered)
  deletePicture(ensureRecordUid(submission.record).recordUid)
  return true
}

export function isApprovedUserRecord(record: PersonnelRecord): boolean {
  return loadApprovedRecordsFromStorage().some((stored) => personnelRecordsMatch(stored, record))
}

export function deleteApprovedPersonnel(record: PersonnelRecord): boolean {
  const existing = loadApprovedRecordsFromStorage()
  const match = existing.find((item) => personnelRecordsMatch(item, record))
  if (!match) return false

  const filtered = existing.filter((item) => !personnelRecordsMatch(item, record))
  saveApprovedRecords(filtered)
  deletePicture(ensureRecordUid(match).recordUid)
  return true
}

export function loadUserPersonnel(): PersonnelRecord[] {
  return loadApprovedPersonnel()
}

export function getUserCreatedCount(): number {
  return getApprovedPersonnelCount()
}

export function buildPersonnelRecord(
  submission: ScpSubmission,
  createdBy: string,
): PersonnelRecord {
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
      {
        label: 'Physical Description',
        value: submission.physicalDescription.trim(),
        minClearance: 1,
      },
      {
        label: 'Anomalous Abilities',
        value: submission.anomalousAbilities.trim(),
        minClearance: 1,
      },
      {
        label: 'Containment Procedures (Defection)',
        value: submission.containmentProcedures.trim(),
        minClearance: 1,
      },
      { label: 'File Author', value: createdBy, minClearance: 1 },
    ],
  }
}
