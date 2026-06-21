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

export function setAuthCookie(res: Response, session: SessionPayload) {
  const token = jwt.sign(session, getJwtSecret(), { expiresIn: '7d' })
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const token = req.cookies?.[COOKIE_NAME]
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

export function toAuthSession(session: SessionPayload) {
  return {
    username: session.username,
    displayName: session.displayName,
    clearance: session.clearance,
    badgeId: session.badgeId,
    isAdministrator: session.isAdministrator,
  }
}
