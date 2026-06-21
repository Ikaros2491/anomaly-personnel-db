export const BUILTIN_PERSONNEL = [
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

export const SEED_USERS = [
  {
    username: 'intern.lee',
    password: 'trainee',
    displayName: 'Lee, M.',
    clearance: 1,
    badgeId: 'ANOREP-0142',
    isAdministrator: false,
  },
  {
    username: 'agent.smith',
    password: 'access',
    displayName: 'Smith, R.',
    clearance: 2,
    badgeId: 'ANOREP-0891',
    isAdministrator: false,
  },
  {
    username: 'director.jones',
    password: 'omega',
    displayName: 'Jones, E.',
    clearance: 4,
    badgeId: 'ANOREP-0003',
    isAdministrator: false,
  },
  {
    username: 'Doll',
    passwordEnv: 'DOLL_PASSWORD',
    passwordDefault: 'Airplane7474',
    displayName: 'Doll',
    clearance: 5,
    badgeId: 'ANOREP-0000',
    isAdministrator: true,
  },
] as const
