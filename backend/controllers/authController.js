// HTTP handling for /api/auth. Rules live in services/authService.js.

import * as authService from '../services/authService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { SESSION_COOKIE, clearSessionCookieOptions, createSession } from '../utils/sessionUtils.js'
import { validateLoginInput, validateRegistrationInput } from '../utils/validationUtils.js'

export const register = async (req, res) => {
  const user = await authService.register(validateRegistrationInput(req.body))
  sendSuccess(res, {
    statusCode: 201,
    message: 'Registration successful. You can now log in.',
    data: { user },
  })
}

export const login = async (req, res) => {
  const { keepSignedIn, ...credentials } = validateLoginInput(req.body)
  const user = await authService.login(credentials)

  const { token, cookieOptions } = createSession(user.id, keepSignedIn)
  res.cookie(SESSION_COOKIE, token, cookieOptions)
  sendSuccess(res, { message: 'Login successful', data: { user } })
}

// requireAuth has already loaded the user
export const me = (req, res) => {
  sendSuccess(res, { message: 'Authenticated', data: { user: req.user } })
}

export const logout = (req, res) => {
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions)
  sendSuccess(res, { message: 'Logged out' })
}
