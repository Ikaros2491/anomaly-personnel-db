import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from './db.js'
import {
  clearAuthCookie,
  createAuthToken,
  getSession,
  requireAdmin,
  requireAuth,
  requireDoll,
  setAuthCookie,
  toAuthSession,
  type SessionPayload,
} from './auth.js'
import { findInRecords, personnelToRowData, rowToPersonnel, sanitizePersonnelForViewer, type PersonnelRecordDto } from './personnel.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

async function loadAllApprovedPersonnel() {
  const rows = await prisma.personnelRecord.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(rowToPersonnel)
}

function nextBadgeId(count: number) {
  return `ANOREP-${String(1000 + count).slice(-4)}`
}

// ——— Auth ———

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username?.trim() || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  })

  if (!user || user.deactivated) {
    res.status(401).json({ error: 'Invalid credentials', deactivated: Boolean(user?.deactivated) })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const session: SessionPayload = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    clearance: user.clearance,
    badgeId: user.badgeId,
    isAdministrator: user.isAdministrator,
    containmentAccess: user.containmentAccess,
  }

  setAuthCookie(res, session)
  // Also return the JWT in the body. Mobile Safari / Chrome often block the
  // cross-site Set-Cookie from anorep-api.onrender.com when the SPA is on
  // anorep.com; the frontend stores this token and sends Authorization.
  res.json({ session: toAuthSession(session), token: createAuthToken(session) })
})

app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/me', async (req, res) => {
  const session = await getSession(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({ session: toAuthSession(session) })
})

// ——— Sign-up (instant CL1 account) ———

app.post('/api/signup', async (req, res) => {
  const { username, password, displayName } = req.body as {
    username?: string
    password?: string
    displayName?: string
  }

  const trimmedUsername = username?.trim() ?? ''
  const trimmedDisplay = displayName?.trim() ?? ''

  if (!trimmedUsername || !password || !trimmedDisplay) {
    res.status(400).json({ error: 'Operator ID, access code, and display name are required.' })
    return
  }

  const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } })
  if (existingUser) {
    res.status(400).json({ error: 'That operator ID is already registered.' })
    return
  }

  const userCount = await prisma.user.count()
  await prisma.user.create({
    data: {
      username: trimmedUsername,
      passwordHash: await bcrypt.hash(password, 10),
      displayName: trimmedDisplay,
      clearance: 1,
      badgeId: nextBadgeId(userCount),
      isAdministrator: false,
      containmentAccess: false,
      isSystem: false,
      deactivated: false,
    },
  })

  res.json({ ok: true })
})

// ——— Personnel ———

app.get('/api/personnel/search', requireAuth, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session
  const query = String(req.query.q ?? '')
  const records = await loadAllApprovedPersonnel()
  const match = findInRecords(records, query)
  res.json({ record: match ? sanitizePersonnelForViewer(match, session) : null })
})

app.get('/api/personnel/stats', requireAuth, async (_req, res) => {
  const approved = await prisma.personnelRecord.count({ where: { isUserCreated: true } })
  const pending = await prisma.pendingPersonnelSubmission.count()
  res.json({ approvedUserCreated: approved, pending })
})

app.post('/api/personnel', requireAuth, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session
  const record = req.body.record

  if (!record?.id || !record?.name || !record?.fields) {
    res.status(400).json({ error: 'Invalid personnel record' })
    return
  }

  if (session.isAdministrator) {
    const row = personnelToRowData({ ...record, isUserCreated: true })
    await prisma.personnelRecord.create({ data: row })
    const created = rowToPersonnel(
      await prisma.personnelRecord.findUniqueOrThrow({ where: { recordUid: row.recordUid } }),
    )
    res.json({ ok: true, immediate: true, record: sanitizePersonnelForViewer(created, session) })
    return
  }

  const submission = await prisma.pendingPersonnelSubmission.create({
    data: {
      recordJson: JSON.stringify({ ...record, recordUid: record.recordUid ?? randomUUID(), isUserCreated: true }),
      submittedBy: session.displayName,
    },
  })

  res.json({
    ok: true,
    immediate: false,
    requestId: submission.requestId,
  })
})

app.get('/api/personnel/pending', requireAdmin, async (_req, res) => {
  const pending = await prisma.pendingPersonnelSubmission.findMany({
    orderBy: { submittedAt: 'desc' },
  })

  res.json({
    submissions: pending.map((item) => ({
      requestId: item.requestId,
      record: JSON.parse(item.recordJson),
      submittedBy: item.submittedBy,
      submittedAt: item.submittedAt.toISOString(),
    })),
  })
})

app.post('/api/personnel/pending/:requestId/approve', requireAdmin, async (req, res) => {
  const { requestId } = req.params
  const submission = await prisma.pendingPersonnelSubmission.findUnique({ where: { requestId } })
  if (!submission) {
    res.status(404).json({ error: 'Submission not found' })
    return
  }

  const record = JSON.parse(submission.recordJson)
  const row = personnelToRowData(record)
  await prisma.personnelRecord.create({ data: row })
  await prisma.pendingPersonnelSubmission.delete({ where: { requestId } })

  res.json({ ok: true, record: rowToPersonnel(await prisma.personnelRecord.findUniqueOrThrow({ where: { recordUid: row.recordUid } })) })
})

app.post('/api/personnel/pending/:requestId/reject', requireAdmin, async (req, res) => {
  const { requestId } = req.params
  try {
    await prisma.pendingPersonnelSubmission.delete({ where: { requestId } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Submission not found' })
  }
})

app.delete('/api/personnel/:recordUid', requireAdmin, async (req, res) => {
  const { recordUid } = req.params
  const record = await prisma.personnelRecord.findUnique({ where: { recordUid } })
  if (!record || record.isBuiltin) {
    res.status(404).json({ error: 'Record not found or cannot be deleted' })
    return
  }

  await prisma.personnelRecord.delete({ where: { recordUid } })
  res.json({ ok: true })
})

app.put('/api/personnel/:recordUid', requireAdmin, async (req, res) => {
  const { recordUid } = req.params
  const { record } = req.body as { record?: PersonnelRecordDto }

  if (!record?.id || !record?.name || !record?.fields) {
    res.status(400).json({ error: 'Invalid personnel record' })
    return
  }

  const existing = await prisma.personnelRecord.findUnique({ where: { recordUid } })
  if (!existing || existing.isBuiltin) {
    res.status(404).json({ error: 'Record not found or cannot be edited' })
    return
  }

  const row = personnelToRowData({
    ...record,
    recordUid,
    createdBy: existing.createdBy ?? record.createdBy,
    createdAt: existing.createdAt.toISOString(),
    isUserCreated: true,
  })

  await prisma.personnelRecord.update({
    where: { recordUid },
    data: {
      designation: row.designation,
      name: row.name,
      aliasesJson: row.aliasesJson,
      picture: row.picture,
      fieldsJson: row.fieldsJson,
    },
  })

  res.json({
    ok: true,
    record: sanitizePersonnelForViewer(
      rowToPersonnel(
        await prisma.personnelRecord.findUniqueOrThrow({ where: { recordUid } }),
      ),
      (req as express.Request & { session: SessionPayload }).session,
    ),
  })
})

app.get('/api/personnel/:recordUid/is-user-created', requireAuth, async (req, res) => {
  const { recordUid } = req.params
  const record = await prisma.personnelRecord.findUnique({ where: { recordUid } })
  res.json({ isUserCreated: Boolean(record?.isUserCreated && !record.isBuiltin) })
})

// ——— Clearance requests ———

app.post('/api/clearance-requests', requireAuth, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session

  if (session.isAdministrator) {
    res.status(403).json({ error: 'Administrators do not submit clearance requests.' })
    return
  }

  const {
    requestedClearance,
    requestContainmentAccess,
    requestDeepAccess,
    name,
    rank,
    job,
    notes,
  } = req.body as {
    requestedClearance?: number
    requestContainmentAccess?: boolean
    /** @deprecated */
    requestDeepAccess?: boolean
    name?: string
    rank?: string
    job?: string
    notes?: string
  }

  const trimmedName = name?.trim() ?? ''
  const trimmedRank = rank?.trim() ?? ''
  const trimmedJob = job?.trim() ?? ''
  const trimmedNotes = notes?.trim() ?? ''
  const clearance = Number(requestedClearance)
  const wantsContainmentAccess = Boolean(requestContainmentAccess ?? requestDeepAccess)

  if (!trimmedName || !trimmedRank || !trimmedJob || !trimmedNotes) {
    res.status(400).json({ error: 'Name, rank, job, and notes are required.' })
    return
  }

  if (![1, 2, 3, 4, 5].includes(clearance)) {
    res.status(400).json({ error: 'Requested clearance must be between 1 and 5.' })
    return
  }

  const isClearanceUpgrade = clearance > session.clearance
  const isContainmentAccessUpgrade = wantsContainmentAccess && !session.containmentAccess

  if (!isClearanceUpgrade && !isContainmentAccessUpgrade) {
    res.status(400).json({
      error:
        'Request a higher clearance than you currently hold, and/or Containment Access if you do not already have it.',
    })
    return
  }

  const existing = await prisma.clearanceRequest.findFirst({
    where: { userId: session.userId },
  })
  if (existing) {
    res.status(409).json({
      error: 'You already have a pending clearance request. Wait for administrator review.',
      existingId: existing.id,
    })
    return
  }

  const created = await prisma.clearanceRequest.create({
    data: {
      userId: session.userId,
      username: session.username,
      requestedClearance: clearance,
      requestContainmentAccess: wantsContainmentAccess,
      name: trimmedName,
      rank: trimmedRank,
      job: trimmedJob,
      notes: trimmedNotes,
    },
  })

  res.json({
    ok: true,
    request: {
      id: created.id,
      userId: created.userId,
      username: created.username,
      requestedClearance: created.requestedClearance,
      requestContainmentAccess: created.requestContainmentAccess,
      name: created.name,
      rank: created.rank,
      job: created.job,
      notes: created.notes,
      submittedAt: created.submittedAt.toISOString(),
    },
  })
})

app.get('/api/clearance-requests/mine', requireAuth, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session
  const request = await prisma.clearanceRequest.findFirst({
    where: { userId: session.userId },
    orderBy: { submittedAt: 'desc' },
  })

  res.json({
    request: request
      ? {
          id: request.id,
          userId: request.userId,
          username: request.username,
          requestedClearance: request.requestedClearance,
          requestContainmentAccess: request.requestContainmentAccess,
          name: request.name,
          rank: request.rank,
          job: request.job,
          notes: request.notes,
          submittedAt: request.submittedAt.toISOString(),
        }
      : null,
  })
})

app.get('/api/clearance-requests/pending', requireAdmin, async (_req, res) => {
  const pending = await prisma.clearanceRequest.findMany({
    orderBy: { submittedAt: 'desc' },
    include: { user: true },
  })

  res.json({
    requests: pending.map((request) => ({
      id: request.id,
      userId: request.userId,
      username: request.username,
      displayName: request.user.displayName,
      currentClearance: request.user.clearance,
      currentContainmentAccess: request.user.containmentAccess,
      requestedClearance: request.requestedClearance,
      requestContainmentAccess: request.requestContainmentAccess,
      name: request.name,
      rank: request.rank,
      job: request.job,
      notes: request.notes,
      submittedAt: request.submittedAt.toISOString(),
    })),
  })
})

app.post('/api/clearance-requests/:id/approve', requireAdmin, async (req, res) => {
  const id = String(req.params.id)
  const request = await prisma.clearanceRequest.findUnique({ where: { id } })
  if (!request) {
    res.status(404).json({ error: 'Request not found' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: request.userId } })
  if (!user || user.deactivated) {
    await prisma.clearanceRequest.delete({ where: { id } })
    res.status(404).json({ error: 'Operator not found or deactivated' })
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      clearance: Math.max(user.clearance, request.requestedClearance),
      containmentAccess: request.requestContainmentAccess ? true : user.containmentAccess,
    },
  })

  await prisma.clearanceRequest.delete({ where: { id } })
  res.json({ ok: true })
})

app.post('/api/clearance-requests/:id/reject', requireAdmin, async (req, res) => {
  const id = String(req.params.id)
  try {
    await prisma.clearanceRequest.delete({ where: { id } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Request not found' })
  }
})

// ——— Operators ———

app.get('/api/operators', requireAdmin, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session
  const users = await prisma.user.findMany({ orderBy: { username: 'asc' } })

  res.json({
    operators: users.map((user) => ({
      username: user.username,
      displayName: user.displayName,
      clearance: user.clearance,
      badgeId: user.badgeId,
      source: user.isSystem ? 'system' : 'approved',
      isAdministrator: user.isAdministrator,
      containmentAccess: user.containmentAccess,
      deactivated: user.deactivated,
      canDelete: !user.isSystem && !user.isAdministrator,
      canModify: !user.isAdministrator,
      canGrantAdmin: !user.isAdministrator && !user.deactivated,
      canRevokeAdmin:
        user.isAdministrator &&
        user.username !== session.username &&
        !user.deactivated,
      canGrantContainmentAccess: !user.containmentAccess && !user.deactivated,
      canRevokeContainmentAccess: user.containmentAccess && !user.deactivated && !user.isAdministrator,
    })),
  })
})

app.patch('/api/operators/:username/clearance', requireAdmin, async (req, res) => {
  const { username } = req.params
  const { clearance } = req.body as { clearance?: number }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || user.isAdministrator) {
    res.status(404).json({ error: 'Operator not found or protected' })
    return
  }

  await prisma.user.update({
    where: { username },
    data: { clearance: clearance ?? user.clearance },
  })

  await prisma.clearanceRequest.deleteMany({ where: { userId: user.id } })

  res.json({ ok: true })
})

app.patch('/api/operators/:username/deactivate', requireAdmin, async (req, res) => {
  const { username } = req.params
  const { deactivated } = req.body as { deactivated?: boolean }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || user.isAdministrator) {
    res.status(404).json({ error: 'Operator not found or protected' })
    return
  }

  await prisma.user.update({
    where: { username },
    data: { deactivated: Boolean(deactivated) },
  })

  res.json({ ok: true })
})

app.patch('/api/operators/:username/administrator', requireAdmin, async (req, res) => {
  const session = (req as express.Request & { session: SessionPayload }).session
  const { username } = req.params
  const { isAdministrator } = req.body as { isAdministrator?: boolean }

  if (username === session.username) {
    res.status(400).json({ error: 'You cannot change your own administrator status.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    res.status(404).json({ error: 'Operator not found' })
    return
  }

  const grantAdmin = Boolean(isAdministrator)

  if (grantAdmin && user.isAdministrator) {
    res.json({ ok: true })
    return
  }

  if (!grantAdmin && user.isAdministrator) {
    const adminCount = await prisma.user.count({ where: { isAdministrator: true } })
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot remove the last administrator.' })
      return
    }
  }

  await prisma.user.update({
    where: { username },
    data: {
      isAdministrator: grantAdmin,
      clearance: grantAdmin ? Math.max(user.clearance, 5) : user.clearance,
    },
  })

  res.json({ ok: true })
})

async function setOperatorContainmentAccess(
  req: express.Request,
  res: express.Response,
) {
  const { username } = req.params
  const body = req.body as { containmentAccess?: boolean; deepAccess?: boolean }
  const containmentAccess = body.containmentAccess ?? body.deepAccess

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || user.deactivated) {
    res.status(404).json({ error: 'Operator not found or deactivated' })
    return
  }

  // Administrators already bypass Containment Access; keep the flag unset for them.
  if (user.isAdministrator) {
    res.status(400).json({ error: 'Administrators already have unrestricted file access.' })
    return
  }

  await prisma.user.update({
    where: { username },
    data: { containmentAccess: Boolean(containmentAccess) },
  })

  await prisma.clearanceRequest.deleteMany({ where: { userId: user.id } })

  res.json({ ok: true })
}

app.patch('/api/operators/:username/containment-access', requireAdmin, setOperatorContainmentAccess)
// Legacy path kept so older clients keep working during deploy.
app.patch('/api/operators/:username/deep-access', requireAdmin, setOperatorContainmentAccess)

app.patch('/api/operators/:username/password', requireDoll, async (req, res) => {
  const { username } = req.params
  const { password } = req.body as { password?: string }

  if (!password?.trim()) {
    res.status(400).json({ error: 'A new access code is required.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    res.status(404).json({ error: 'Operator not found' })
    return
  }

  await prisma.user.update({
    where: { username },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  })

  res.json({ ok: true })
})

app.delete('/api/operators/:username', requireAdmin, async (req, res) => {
  const { username } = req.params
  const user = await prisma.user.findUnique({ where: { username } })

  if (!user || user.isSystem || user.isAdministrator) {
    res.status(404).json({ error: 'Operator not found or cannot be deleted' })
    return
  }

  await prisma.user.delete({ where: { username } })
  res.json({ ok: true })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

export function startServer() {
  app.listen(port, () => {
    console.log(`ANOREP API running on http://localhost:${port}`)
  })
}

const entryScript = process.argv[1] ?? ''
if (entryScript.endsWith('index.ts') || entryScript.endsWith('index.js')) {
  startServer()
}
