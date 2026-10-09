import AppError from '../utils/AppError.js'

// Use after requireAuth: requireRole('admin') or requireRole('student', 'instructor').
// The role checked is req.user.role, which requireAuth loaded from the database.
export const requireRole =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) throw new AppError(401, 'Unauthorized. Please log in.')
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'Forbidden. You do not have access to this resource.')
    }
    next()
  }
