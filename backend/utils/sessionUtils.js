// Login sessions: a signed token (JWT) stored in an httpOnly cookie, so page scripts
// can never read it. The token only carries the user id and the account's session
// version; role and status are read from the database on every request (see
// middleware/authMiddleware.js). Deactivating an account raises its session version, which
// makes every token issued before that point invalid.

import jwt from 'jsonwebtoken'
import env from '../config/env.js'

export const SESSION_COOKIE = 'jds_session'

const ALGORITHM = 'HS256'
const DAY_SECONDS = 24 * 60 * 60
const SESSION_SECONDS = DAY_SECONDS
const KEEP_SIGNED_IN_SECONDS = 30 * DAY_SECONDS

const baseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  path: '/',
}

// Without "keep me signed in" the cookie disappears when the browser closes
export const createSession = (userId, sessionVersion, keepSignedIn = false) => {
  const lifetime = keepSignedIn ? KEEP_SIGNED_IN_SECONDS : SESSION_SECONDS
  const token = jwt.sign({ sub: String(userId), ver: sessionVersion }, env.authSecret, {
    algorithm: ALGORITHM,
    expiresIn: lifetime,
  })
  const cookieOptions = keepSignedIn
    ? { ...baseCookieOptions, maxAge: lifetime * 1000 }
    : baseCookieOptions
  return { token, cookieOptions }
}

export const clearSessionCookieOptions = baseCookieOptions

// Returns { userId, sessionVersion } from a valid token, or null.
// Tokens issued before session versions existed carry no `ver` and count as version 0.
export const readSession = (token) => {
  if (!token) return null
  try {
    const payload = jwt.verify(token, env.authSecret, { algorithms: [ALGORITHM] })
    const userId = Number(payload.sub)
    const sessionVersion = payload.ver ?? 0
    if (!Number.isInteger(userId) || !Number.isInteger(sessionVersion)) return null
    return { userId, sessionVersion }
  } catch {
    return null
  }
}
