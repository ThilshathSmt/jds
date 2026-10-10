import { getActiveUserById } from '../services/authService.js'
import AppError from '../utils/AppError.js'
import { SESSION_COOKIE, readSession } from '../utils/sessionUtils.js'

// Requires a valid session. Sets req.user from the database, so the role is always the
// server's own record, and a deactivated or deleted account loses access immediately.
export const requireAuth = async (req, res, next) => {
  const session = readSession(req.cookies?.[SESSION_COOKIE])
  const user = session ? await getActiveUserById(session.userId, session.sessionVersion) : null
  if (!user) throw new AppError(401, 'Unauthorized. Please log in.')

  req.user = user
  next()
}
