export type ClearanceLevel = 1 | 2 | 3 | 4 | 5

export interface UserAccount {
  username: string
  password: string
  displayName: string
  clearance: ClearanceLevel
  badgeId: string
  isAdministrator?: boolean
  deactivated?: boolean
}

export type OperatorSource = 'system' | 'approved'

export interface ManagedOperator {
  username: string
  displayName: string
  clearance: ClearanceLevel
  badgeId: string
  source: OperatorSource
  isAdministrator: boolean
  deepAccess: boolean
  deactivated: boolean
  canDelete: boolean
  canModify: boolean
  canGrantAdmin: boolean
  canRevokeAdmin: boolean
  canGrantDeepAccess: boolean
  canRevokeDeepAccess: boolean
}

export interface ClearanceRequestFormData {
  requestedClearance: ClearanceLevel
  requestDeepAccess: boolean
  name: string
  rank: string
  job: string
  notes: string
}

export interface ClearanceRequest {
  id: string
  userId: string
  username: string
  displayName?: string
  currentClearance?: ClearanceLevel
  currentDeepAccess?: boolean
  requestedClearance: ClearanceLevel
  requestDeepAccess: boolean
  name: string
  rank: string
  job: string
  notes: string
  submittedAt: string
}

export interface PersonnelField {
  label: string
  value: string
  minClearance: ClearanceLevel
  requiresDeepAccess?: boolean
  redacted?: boolean
}

export interface PersonnelRecord {
  recordUid?: string
  id: string
  name: string
  aliases: string[]
  picture?: string
  fields: PersonnelField[]
  createdBy?: string
  createdAt?: string
  isUserCreated?: boolean
}

export interface PendingPersonnelSubmission {
  requestId: string
  record: PersonnelRecord
  submittedBy: string
  submittedAt: string
}

export interface ScpSubmission {
  designation: string
  name: string
  role: string
  picture: string
  physicalDescription: string
  anomalousAbilities: string
  containmentProcedures: string
  terminateContainProcedures: string
}

export interface SignupFormData {
  username: string
  password: string
  displayName: string
}

export interface AuthSession {
  username: string
  displayName: string
  clearance: ClearanceLevel
  badgeId: string
  isAdministrator: boolean
  deepAccess: boolean
}

export type AppView = 'home' | 'search' | 'add' | 'approve' | 'operators' | 'clearance'

export const CL2_MIN_CLEARANCE: ClearanceLevel = 2

export const EMPTY_SCP_SUBMISSION: ScpSubmission = {
  designation: '',
  name: '',
  role: '',
  picture: '',
  physicalDescription: '',
  anomalousAbilities: '',
  containmentProcedures: '',
  terminateContainProcedures: '',
}

export const EMPTY_SIGNUP_FORM: SignupFormData = {
  username: '',
  password: '',
  displayName: '',
}

export const EMPTY_CLEARANCE_REQUEST_FORM: ClearanceRequestFormData = {
  requestedClearance: 2,
  requestDeepAccess: false,
  name: '',
  rank: '',
  job: '',
  notes: '',
}
