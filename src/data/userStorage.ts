import type { ClearanceLevel, ManagedOperator, SignupRequest, UserAccount } from '../types'
import { DEMO_ACCOUNTS } from './mockDatabase'

const APPROVED_USERS_KEY = 'anorep-approved-users'
const PENDING_SIGNUPS_KEY = 'anorep-pending-signups'
const OPERATOR_OVERRIDES_KEY = 'anorep-operator-overrides'

interface OperatorOverride {
  username: string
  clearance?: ClearanceLevel
  deactivated?: boolean
}

function normalizeToArray<T>(parsed: unknown): T[] {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') return [parsed as T]
  return []
}

function loadJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return normalizeToArray<T>(JSON.parse(raw))
  } catch {
    return []
  }
}

function saveJson<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Ignore quota errors
  }
}

function loadOverrides(): OperatorOverride[] {
  return loadJson<OperatorOverride>(OPERATOR_OVERRIDES_KEY)
}

function saveOverrides(overrides: OperatorOverride[]) {
  saveJson(OPERATOR_OVERRIDES_KEY, overrides)
}

function getOverride(username: string): OperatorOverride | undefined {
  const normalized = username.toLowerCase()
  return loadOverrides().find((entry) => entry.username.toLowerCase() === normalized)
}

function upsertOverride(username: string, patch: Partial<Omit<OperatorOverride, 'username'>>) {
  const overrides = loadOverrides()
  const normalized = username.toLowerCase()
  const index = overrides.findIndex((entry) => entry.username.toLowerCase() === normalized)

  if (index === -1) {
    overrides.push({ username, ...patch })
  } else {
    overrides[index] = { ...overrides[index], ...patch, username: overrides[index].username }
  }

  saveOverrides(overrides)
}

function removeOverride(username: string) {
  const normalized = username.toLowerCase()
  saveOverrides(loadOverrides().filter((entry) => entry.username.toLowerCase() !== normalized))
}

function isProtectedOperator(account: UserAccount): boolean {
  return Boolean(account.isAdministrator)
}

function applyOverrides(account: UserAccount): UserAccount {
  const override = getOverride(account.username)
  if (!override) {
    return { ...account, deactivated: account.deactivated ?? false }
  }

  return {
    ...account,
    clearance: override.clearance ?? account.clearance,
    deactivated: override.deactivated ?? account.deactivated ?? false,
  }
}

function toManagedOperator(account: UserAccount, source: ManagedOperator['source']): ManagedOperator {
  const effective = applyOverrides(account)
  const protectedAccount = isProtectedOperator(account)

  return {
    username: effective.username,
    displayName: effective.displayName,
    clearance: effective.clearance,
    badgeId: effective.badgeId,
    source,
    isAdministrator: Boolean(effective.isAdministrator),
    deactivated: Boolean(effective.deactivated),
    canDelete: source === 'approved' && !protectedAccount,
    canModify: !protectedAccount,
  }
}

function resolveAccount(username: string, password: string): UserAccount | null {
  const normalized = username.trim().toLowerCase()
  const demoAccount = DEMO_ACCOUNTS.find(
    (entry) =>
      entry.username.toLowerCase() === normalized && entry.password === password,
  )
  if (demoAccount) return demoAccount

  return (
    loadApprovedUsers().find(
      (account) =>
        account.username.toLowerCase() === normalized && account.password === password,
    ) ?? null
  )
}

export function loadApprovedUsers(): UserAccount[] {
  return loadJson<UserAccount>(APPROVED_USERS_KEY).map(applyOverrides)
}

export function loadPendingSignups(): SignupRequest[] {
  return loadJson<SignupRequest>(PENDING_SIGNUPS_KEY)
}

export function getPendingSignupCount(): number {
  return loadPendingSignups().length
}

export function getAllManagedOperators(): ManagedOperator[] {
  const approvedUsernames = new Set(loadApprovedUsers().map((u) => u.username.toLowerCase()))

  const systemOperators = DEMO_ACCOUNTS.filter(
    (account) => !approvedUsernames.has(account.username.toLowerCase()),
  ).map((account) => toManagedOperator(account, 'system'))

  const approvedOperators = loadApprovedUsers().map((account) =>
    toManagedOperator(account, 'approved'),
  )

  return [...systemOperators, ...approvedOperators].sort((a, b) =>
    a.username.localeCompare(b.username),
  )
}

function usernameExists(username: string): boolean {
  const normalized = username.trim().toLowerCase()
  const inDemo = DEMO_ACCOUNTS.some((a) => a.username.toLowerCase() === normalized)
  const inApproved = loadJson<UserAccount>(APPROVED_USERS_KEY).some(
    (a) => a.username.toLowerCase() === normalized,
  )
  const inPending = loadPendingSignups().some((a) => a.username.toLowerCase() === normalized)
  return inDemo || inApproved || inPending
}

export function submitSignupRequest(
  username: string,
  password: string,
  displayName: string,
  justification: string,
): { ok: true } | { ok: false; error: string } {
  const trimmedUsername = username.trim()
  const trimmedDisplay = displayName.trim()

  if (!trimmedUsername || !password || !trimmedDisplay) {
    return { ok: false, error: 'Operator ID, access code, and display name are required.' }
  }

  if (usernameExists(trimmedUsername)) {
    return { ok: false, error: 'That operator ID is already registered or pending review.' }
  }

  const request: SignupRequest = {
    id: crypto.randomUUID(),
    username: trimmedUsername,
    password,
    displayName: trimmedDisplay,
    justification: justification.trim(),
    submittedAt: new Date().toISOString(),
  }

  const pending = loadPendingSignups()
  pending.unshift(request)
  saveJson(PENDING_SIGNUPS_KEY, pending)
  return { ok: true }
}

function nextBadgeId(): string {
  const count = loadJson<UserAccount>(APPROVED_USERS_KEY).length + 1
  return `ANOREP-${String(1000 + count).slice(-4)}`
}

export function approveSignupRequest(
  requestId: string,
  clearance: ClearanceLevel,
): UserAccount | null {
  const pending = loadPendingSignups()
  const index = pending.findIndex((r) => r.id === requestId)
  if (index === -1) return null

  const [request] = pending.splice(index, 1)
  saveJson(PENDING_SIGNUPS_KEY, pending)

  const account: UserAccount = {
    username: request.username,
    password: request.password,
    displayName: request.displayName,
    clearance,
    badgeId: nextBadgeId(),
    deactivated: false,
  }

  const approved = loadJson<UserAccount>(APPROVED_USERS_KEY)
  approved.push(account)
  saveJson(APPROVED_USERS_KEY, approved)
  return account
}

export function rejectSignupRequest(requestId: string): boolean {
  const pending = loadPendingSignups()
  const filtered = pending.filter((r) => r.id !== requestId)
  if (filtered.length === pending.length) return false
  saveJson(PENDING_SIGNUPS_KEY, filtered)
  return true
}

export function resolveEffectiveAccount(username: string, password: string): UserAccount | null {
  const account = resolveAccount(username, password)
  return account ? applyOverrides(account) : null
}

export function findApprovedUser(username: string, password: string): UserAccount | null {
  const normalized = username.trim().toLowerCase()
  const account =
    loadJson<UserAccount>(APPROVED_USERS_KEY).find(
      (entry) =>
        entry.username.toLowerCase() === normalized && entry.password === password,
    ) ?? null

  return account ? applyOverrides(account) : null
}

export function isLoginDeactivated(username: string, password: string): boolean {
  const account = resolveAccount(username, password)
  if (!account) return false
  return Boolean(applyOverrides(account).deactivated)
}

export function updateOperatorClearance(username: string, clearance: ClearanceLevel): boolean {
  const normalized = username.toLowerCase()
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === normalized)
  const approvedIndex = loadJson<UserAccount>(APPROVED_USERS_KEY).findIndex(
    (a) => a.username.toLowerCase() === normalized,
  )

  const account =
    demoAccount ?? (approvedIndex >= 0 ? loadJson<UserAccount>(APPROVED_USERS_KEY)[approvedIndex] : null)
  if (!account || isProtectedOperator(account)) return false

  if (approvedIndex >= 0) {
    const approved = loadJson<UserAccount>(APPROVED_USERS_KEY)
    approved[approvedIndex] = { ...approved[approvedIndex], clearance }
    saveJson(APPROVED_USERS_KEY, approved)
    return true
  }

  upsertOverride(username, { clearance })
  return true
}

export function setOperatorDeactivated(username: string, deactivated: boolean): boolean {
  const normalized = username.toLowerCase()
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === normalized)
  const approved = loadJson<UserAccount>(APPROVED_USERS_KEY)
  const approvedIndex = approved.findIndex((a) => a.username.toLowerCase() === normalized)

  const account = demoAccount ?? (approvedIndex >= 0 ? approved[approvedIndex] : null)
  if (!account || isProtectedOperator(account)) return false

  if (approvedIndex >= 0) {
    approved[approvedIndex] = { ...approved[approvedIndex], deactivated }
    saveJson(APPROVED_USERS_KEY, approved)
    return true
  }

  upsertOverride(username, { deactivated })
  return true
}

export function deleteOperatorAccount(username: string): boolean {
  const normalized = username.toLowerCase()
  const approved = loadJson<UserAccount>(APPROVED_USERS_KEY)
  const account = approved.find((a) => a.username.toLowerCase() === normalized)
  if (!account || isProtectedOperator(account)) return false

  saveJson(
    APPROVED_USERS_KEY,
    approved.filter((a) => a.username.toLowerCase() !== normalized),
  )
  removeOverride(username)
  return true
}
