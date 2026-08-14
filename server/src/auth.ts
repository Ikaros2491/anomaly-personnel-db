import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from './db.js'

export interface SessionPayload {
  userId: string
  username: string
  displayName: string
  clearance: number
  badgeId: string
  isAdministrator: boolean
  containmentAccess: boolean
}

const COOKIE_NAME = 'anorep_token'

function cookieOptions() {
  const crossSite = process.env.COOKIE_CROSS_SITE === 'true'

  return {
    httpOnly: true,
    sameSite: crossSite ? ('none' as const) : ('lax' as const),
    secure: crossSite || process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-insecure-secret'
}

export function createAuthToken(session: SessionPayload): string {
  return jwt.sign(session, getJwtSecret(), { expiresIn: '7d' })
}

export function setAuthCookie(res: Response, session: SessionPayload) {
  res.cookie(COOKIE_NAME, createAuthToken(session), cookieOptions())
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() || null
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  // Prefer Authorization bearer tokens so mobile browsers that block
  // third-party cookies (anorep.com → anorep-api.onrender.com) still work.
  const token = readBearerToken(req) ?? req.cookies?.[COOKIE_NAME]
  if (!token) return null

  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || user.deactivated) return null

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      clearance: user.clearance,
      badgeId: user.badgeId,
      isAdministrator: user.isAdministrator,
      containmentAccess: user.containmentAccess,
    }
  } catch {
    return null
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  getSession(req)
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      ;(req as Request & { session: SessionPayload }).session = session
      next()
    })
    .catch(next)
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  getSession(req)
    .then((session) => {
      if (!session?.isAdministrator) {
        res.status(403).json({ error: 'Administrator access required' })
        return
      }
      ;(req as Request & { session: SessionPayload }).session = session
      next()
    })
    .catch(next)
}

export function isDollAccount(username: string) {
  return username === 'Doll'
}

export function requireDoll(req: Request, res: Response, next: NextFunction) {
  getSession(req)
    .then((session) => {
      if (!session || !isDollAccount(session.username)) {
        res.status(403).json({ error: 'Doll clearance required' })
        return
      }
      ;(req as Request & { session: SessionPayload }).session = session
      next()
    })
    .catch(next)
}

export function toAuthSession(session: SessionPayload) {
  return {
    username: session.username,
    displayName: session.displayName,
    clearance: session.clearance,
    badgeId: session.badgeId,
    isAdministrator: session.isAdministrator,
    containmentAccess: session.containmentAccess,
  }
}
