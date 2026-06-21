import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from './db.js'
import {
  clearAuthCookie,
  getSession,
  requireAdmin,
  requireAuth,
  setAuthCookie,
  toAuthSession,
  type SessionPayload,
} from './auth.js'
import { findInRecords, personnelToRowData, rowToPersonnel } from './personnel.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
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
  }

  setAuthCookie(res, session)
  res.json({ session: toAuthSession(session) })
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

// ——— Sign-up ———

app.post('/api/signup', async (req, res) => {
  const { username, password, displayName, justification } = req.body as {
    username?: string
    password?: string
    displayName?: string
    justification?: string
  }

  const trimmedUsername = username?.trim() ?? ''
  const trimmedDisplay = displayName?.trim() ?? ''

  if (!trimmedUsername || !password || !trimmedDisplay) {
    res.status(400).json({ error: 'Operator ID, access code, and display name are required.' })
    return
  }

  const existingUser = await prisma.user.findUnique({ where: { username: trimmedUsername } })
  const existingPending = await prisma.signupRequest.findUnique({
    where: { username: trimmedUsername },
  })

  if (existingUser || existingPending) {
    res.status(400).json({ error: 'That operator ID is already registered or pending review.' })
    return
  }

  await prisma.signupRequest.create({
    data: {
      username: trimmedUsername,
      passwordHash: await bcrypt.hash(password, 10),
      displayName: trimmedDisplay,
      justification: justification?.trim() ?? '',
    },
  })

  res.json({ ok: true })
})

// ——— Personnel ———

app.get('/api/personnel/search', requireAuth, async (req, res) => {
  const query = String(req.query.q ?? '')
  const records = await loadAllApprovedPersonnel()
  const match = findInRecords(records, query)
  res.json({ record: match })
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
    res.json({ ok: true, immediate: true, record: rowToPersonnel(await prisma.personnelRecord.findUniqueOrThrow({ where: { recordUid: row.recordUid } })) })
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

app.get('/api/personnel/:recordUid/is-user-created', requireAuth, async (req, res) => {
  const { recordUid } = req.params
  const record = await prisma.personnelRecord.findUnique({ where: { recordUid } })
  res.json({ isUserCreated: Boolean(record?.isUserCreated && !record.isBuiltin) })
})

// ——— Admin signups ———

app.get('/api/signups/pending', requireAdmin, async (_req, res) => {
  const pending = await prisma.signupRequest.findMany({ orderBy: { submittedAt: 'desc' } })
  res.json({
    requests: pending.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      justification: r.justification,
      submittedAt: r.submittedAt.toISOString(),
    })),
  })
})

app.post('/api/signups/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params
  const { clearance } = req.body as { clearance?: number }

  const request = await prisma.signupRequest.findUnique({ where: { id } })
  if (!request) {
    res.status(404).json({ error: 'Request not found' })
    return
  }

  const userCount = await prisma.user.count()
  const user = await prisma.user.create({
    data: {
      username: request.username,
      passwordHash: request.passwordHash,
      displayName: request.displayName,
      clearance: clearance ?? 1,
      badgeId: nextBadgeId(userCount),
      isAdministrator: false,
      isSystem: false,
      deactivated: false,
    },
  })

  await prisma.signupRequest.delete({ where: { id } })
  res.json({ ok: true, user: { username: user.username, displayName: user.displayName, clearance: user.clearance, badgeId: user.badgeId } })
})

app.post('/api/signups/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await prisma.signupRequest.delete({ where: { id } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Request not found' })
  }
})

// ——— Operators ———

app.get('/api/operators', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { username: 'asc' } })

  res.json({
    operators: users.map((user) => ({
      username: user.username,
      displayName: user.displayName,
      clearance: user.clearance,
      badgeId: user.badgeId,
      source: user.isSystem ? 'system' : 'approved',
      isAdministrator: user.isAdministrator,
      deactivated: user.deactivated,
      canDelete: !user.isSystem && !user.isAdministrator,
      canModify: !user.isAdministrator,
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

app.listen(port, () => {
  console.log(`ANOREP API running on http://localhost:${port}`)
})
