// HTTP handling for /api/auth. Rules live in services/authService.js.

import * as accountService from '../services/accountService.js'
import * as authService from '../services/authService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { SESSION_COOKIE, clearSessionCookieOptions, createSession } from '../utils/sessionUtils.js'
import {
  validateDrivingSchoolIdInput,
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegistrationInput,
  validateResetPasswordInput,
  validateTokenInput,
} from '../utils/validationUtils.js'

export const register = async (req, res) => {
  const user = await authService.register(validateRegistrationInput(req.body))
  sendSuccess(res, {
    statusCode: 201,
    message: 'Registration successful. You can now log in.',
    data: { user },
  })
}

// Public: POST /api/auth/register/verify { drivingSchoolId }: the approved application's
// name and e-mail, shown read-only on the registration page
export const verifyRegistrationId = async (req, res) => {
  const details = await authService.verifyRegistrationId(validateDrivingSchoolIdInput(req.body))
  sendSuccess(res, { message: 'Driving School ID verified.', data: { details } })
}

export const login = async (req, res) => {
  const { keepSignedIn, ...credentials } = validateLoginInput(req.body)
  const { user, sessionVersion } = await authService.login(credentials)

  const { token, cookieOptions } = createSession(user.id, sessionVersion, keepSignedIn)
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

// ---- Password recovery and e-mail confirmation: no login needed

export const PASSWORD_RESET_REQUESTED_MESSAGE =
  'If an account exists for this email address, password reset instructions will be sent.'

// POST /api/auth/forgot-password { email }
// The same answer, straight away, whether or not the address has an account: the e-mail
// is sent after the response, so neither the answer nor its timing tells. A failure to
// send is logged without the address or the link.
export const forgotPassword = async (req, res) => {
  const input = validateForgotPasswordInput(req.body)
  sendSuccess(res, { message: PASSWORD_RESET_REQUESTED_MESSAGE })
  accountService.requestPasswordReset(input).catch((error) => {
    console.error(`Password reset e-mail could not be sent: ${error.message}`)
  })
}

// POST /api/auth/reset-password/check { token }: whether the link can still be used
export const checkResetLink = async (req, res) => {
  const data = await accountService.checkPasswordResetLink(validateTokenInput(req.body))
  sendSuccess(res, { message: 'The link is valid.', data })
}

// POST /api/auth/reset-password { token, password, confirmPassword }
export const resetPassword = async (req, res) => {
  const { drivingSchoolId, locked } = await accountService.resetPassword(validateResetPasswordInput(req.body))
  // The browser may still hold a session of this account; it no longer works
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions)
  sendSuccess(res, {
    message: locked
      ? 'Your password has been changed. Your account is still locked: submit a new registration application to have it reactivated.'
      : 'Your password has been changed. You can now log in with your new password.',
    data: { drivingSchoolId, locked },
  })
}

// POST /api/auth/verify-email { token }: confirms a new e-mail address chosen in Settings
export const verifyEmail = async (req, res) => {
  const data = await accountService.confirmEmailChange(validateTokenInput(req.body))
  sendSuccess(res, { message: `Your e-mail address has been changed to ${data.email}.`, data })
}
