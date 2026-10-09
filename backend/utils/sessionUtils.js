// Login sessions: a signed token (JWT) stored in an httpOnly cookie, so page scripts
// can never read it. The token only carries the user id; role and status are read
// from the database on every request (see middleware/authMiddleware.js).

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
export const createSession = (userId, keepSignedIn = false) => {
  const lifetime = keepSignedIn ? KEEP_SIGNED_IN_SECONDS : SESSION_SECONDS
  const token = jwt.sign({ sub: String(userId) }, env.authSecret, {
    algorithm: ALGORITHM,
    expiresIn: lifetime,
  })
  const cookieOptions = keepSignedIn
    ? { ...baseCookieOptions, maxAge: lifetime * 1000 }
    : baseCookieOptions
  return { token, cookieOptions }
}

export const clearSessionCookieOptions = baseCookieOptions

// Returns the user id from a valid token, or null
export const readSessionUserId = (token) => {
  if (!token) return null
  try {
    const payload = jwt.verify(token, env.authSecret, { algorithms: [ALGORITHM] })
    const userId = Number(payload.sub)
    return Number.isInteger(userId) ? userId : null
  } catch {
    return null
  }
}
