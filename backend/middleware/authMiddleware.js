import { getSessionUser, lockedError } from '../services/authService.js'
import AppError from '../utils/AppError.js'
import { SESSION_COOKIE, readSession } from '../utils/sessionUtils.js'

// Requires a valid session. Sets req.user from the database, so the role is always the
// server's own record, and a deactivated or deleted account loses access immediately.
// So does a locked one (three failed examination attempts): it is refused on every
// protected route, whatever the browser still shows.
export const requireAuth = async (req, res, next) => {
  const session = readSession(req.cookies?.[SESSION_COOKIE])
  const found = session ? await getSessionUser(session.userId, session.sessionVersion) : null
  if (!found) throw new AppError(401, 'Unauthorized. Please log in.')
  if (found.locked) throw lockedError()

  req.user = found.user
  next()
}
