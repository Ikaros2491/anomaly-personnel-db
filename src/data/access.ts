import { CLEARANCE_LABELS } from './mockDatabase'
import type { AuthSession, ClearanceLevel } from '../types'
import { CL2_MIN_CLEARANCE } from '../types'

export function canRegisterScp(session: AuthSession): boolean {
  return session.isAdministrator || session.clearance >= CL2_MIN_CLEARANCE
}

export function getEffectiveClearance(session: AuthSession): number {
  return session.isAdministrator ? 999 : session.clearance
}

export function getAccessLabel(session: AuthSession): string {
  if (session.isAdministrator) {
    return 'ADMINISTRATOR'
  }
  return CLEARANCE_LABELS[session.clearance as ClearanceLevel]
}

export function canViewField(session: AuthSession, minClearance: ClearanceLevel): boolean {
  return session.isAdministrator || session.clearance >= minClearance
}
