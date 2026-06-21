import type { PersonnelRecord, UserAccount } from '../types'
import { loadUserPersonnel } from './personnelStorage'
import { resolveEffectiveAccount } from './userStorage'

export const CLEARANCE_LABELS: Record<number, string> = {
  1: 'RESTRICTED',
  2: 'CONFIDENTIAL',
  3: 'SECRET',
  4: 'TOP SECRET',
  5: 'OMEGA',
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    username: 'intern.lee',
    password: 'trainee',
    displayName: 'Lee, M.',
    clearance: 1,
    badgeId: 'ANOREP-0142',
  },
  {
    username: 'agent.smith',
    password: 'access',
    displayName: 'Smith, R.',
    clearance: 2,
    badgeId: 'ANOREP-0891',
  },
  {
    username: 'director.jones',
    password: 'omega',
    displayName: 'Jones, E.',
    clearance: 4,
    badgeId: 'ANOREP-0003',
  },
  {
    username: 'Doll',
    password: 'Airplane7474',
    displayName: 'Doll',
    clearance: 5,
    badgeId: 'ANOREP-0000',
    isAdministrator: true,
  },
]

export const PERSONNEL_DATABASE: PersonnelRecord[] = [
  {
    id: 'AP-7734',
    name: 'Dr. Elena Voss',
    aliases: ['E. Voss', 'Voss', 'Subject V-7734'],
    fields: [
      { label: 'Status', value: 'ACTIVE — UNDER OBSERVATION', minClearance: 1 },
      { label: 'Division', value: 'Anomalous Research / Site-19', minClearance: 1 },
      { label: 'Classification', value: 'Type-II Cognitohazard Carrier', minClearance: 2 },
      { label: 'Assignment', value: 'Lead Analyst, Memetic Containment Protocols', minClearance: 2 },
      { label: 'Anomaly Designation', value: 'AP-7734 "The Archivist"', minClearance: 3 },
      {
        label: 'Containment Notes',
        value:
          'Subject retains full recall of redacted documents upon visual contact. Mandatory amnestic cycle every 72 hours. No unsupervised archive access.',
        minClearance: 3,
      },
      {
        label: 'Psychological Evaluation',
        value:
          'Stable under current regimen. Exhibits compulsive cataloguing behavior. Do not permit contact with unindexed materials.',
        minClearance: 4,
      },
      {
        label: 'Incident Log',
        value: 'Event 7734-B (██/██/20██): Brief containment breach during transfer. 3 casualties. Reclassified.',
        minClearance: 4,
      },
    ],
  },
  {
    id: 'AP-1102',
    name: 'Marcus Hale',
    aliases: ['M. Hale', 'Hale', 'Subject H-1102'],
    fields: [
      { label: 'Status', value: 'DETAINED — NON-COMPLIANT', minClearance: 1 },
      { label: 'Division', value: 'Field Operations / Mobile Task Force', minClearance: 1 },
      { label: 'Classification', value: 'Type-I Spatial Anomaly', minClearance: 2 },
      { label: 'Assignment', value: 'Former MTF Operative (Suspended)', minClearance: 2 },
      { label: 'Anomaly Designation', value: 'AP-1102 "Phase Walker"', minClearance: 3 },
      {
        label: 'Containment Notes',
        value:
          'Subject involuntarily displaces 0.3–1.2m when startled. Standard restraints ineffective. Held in dimensional anchor cell 7-C.',
        minClearance: 3,
      },
      {
        label: 'Psychological Evaluation',
        value: 'Hostile. Refuses clearance-compliant questioning. Recommend enhanced interrogation protocols.',
        minClearance: 4,
      },
    ],
  },
  {
    id: 'AP-0044',
    name: 'Yuki Tanaka',
    aliases: ['Y. Tanaka', 'Tanaka', 'Subject T-0044'],
    fields: [
      { label: 'Status', value: 'ACTIVE — CLEARED FOR FIELD', minClearance: 1 },
      { label: 'Division', value: 'Anomaly Response / Site-07', minClearance: 1 },
      { label: 'Classification', value: 'Type-0 Latent Anomaly', minClearance: 2 },
      { label: 'Assignment', value: 'Field Liaison, Low-Risk Anomaly Integration', minClearance: 2 },
      { label: 'Anomaly Designation', value: 'AP-0044 "Null Resonance"', minClearance: 3 },
      {
        label: 'Containment Notes',
        value:
          'Subject dampens minor anomalous signatures within 12m radius. Effect scales with emotional state. Monitoring only.',
        minClearance: 3,
      },
      {
        label: 'Psychological Evaluation',
        value: 'Cooperative. High stress tolerance. Cleared for paired deployment.',
        minClearance: 4,
      },
      {
        label: 'Incident Log',
        value: 'No major incidents on record. Minor equipment interference noted during Site-07 blackout drill.',
        minClearance: 4,
      },
    ],
  },
  {
    id: 'AP-9910',
    name: 'Director Evelyn Cross',
    aliases: ['E. Cross', 'Cross', 'Director Cross'],
    fields: [
      { label: 'Status', value: 'ACTIVE — EXECUTIVE', minClearance: 1 },
      { label: 'Division', value: 'Administration / Central Command', minClearance: 1 },
      { label: 'Classification', value: 'Type-III Temporal Echo', minClearance: 2 },
      { label: 'Assignment', value: 'Regional Director, Anomalous Personnel Oversight', minClearance: 2 },
      { label: 'Anomaly Designation', value: 'AP-9910 "The Hourglass"', minClearance: 3 },
      {
        label: 'Containment Notes',
        value:
          'Subject experiences localized temporal desync (±4 seconds). Classified executive exemption. Personal chronometer mandatory.',
        minClearance: 3,
      },
      {
        label: 'Psychological Evaluation',
        value: 'CLASSIFIED — OMEGA CLEARANCE REQUIRED',
        minClearance: 5,
      },
    ],
  },
]

export function getAllPersonnelRecords(): PersonnelRecord[] {
  return [...loadUserPersonnel(), ...PERSONNEL_DATABASE]
}

export function findPersonnel(query: string): PersonnelRecord | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null

  return (
    getAllPersonnelRecords().find((record) => {
      const nameMatch = record.name.toLowerCase().includes(normalized)
      const aliasMatch = record.aliases.some((alias) => alias.toLowerCase().includes(normalized))
      const idMatch = record.id.toLowerCase() === normalized
      return nameMatch || aliasMatch || idMatch
    }) ?? null
  )
}

export function authenticate(username: string, password: string) {
  const account = resolveEffectiveAccount(username, password)
  if (!account || account.deactivated) return null

  return {
    username: account.username,
    displayName: account.displayName,
    clearance: account.clearance,
    badgeId: account.badgeId,
    isAdministrator: account.isAdministrator ?? false,
  }
}
