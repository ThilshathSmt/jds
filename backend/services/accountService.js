// Business rules for the links sent by e-mail: "Forgot password?" on the login page and the
// confirmation of a new e-mail address chosen on the Settings page. Neither needs a login:
// holding the link proves control of the mailbox it was sent to.
//
// What the server alone decides, whatever a browser sends:
//   - which account a link belongs to (the stored token, never anything in the request)
//   - that a link works once, until it expires, and only while it is the newest of its kind
//   - that only the password (or the e-mail) changes: never the Driving School ID, role,
//     status or lock. A locked account stays locked and an inactive one gets no e-mail.
//   - whether an address belongs to an account is never revealed by the answer
//
// Every function takes `now` last. Callers leave it out; tests pass a fixed time.

import { withTransaction } from '../config/database.js'
import {
  EMAIL_CHANGE_TTL_MINUTES,
  PASSWORD_RESET_RESEND_SECONDS,
  PASSWORD_RESET_TTL_MINUTES,
  TOKEN_PURPOSES,
} from '../config/account.js'
import * as accountTokenModel from '../models/accountTokenModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { hashPassword } from '../utils/passwordUtils.js'
import { createToken, hashToken } from '../utils/tokenUtils.js'
import { INVALID_LINK_CODE } from '../utils/validationUtils.js'
import { frontendUrl, sendEmailChangeVerification, sendPasswordResetEmail } from './emailService.js'

export const LINK_CODES = { invalid: INVALID_LINK_CODE, expired: 'LINK_EXPIRED', used: 'LINK_USED' }
const MINUTE_MS = 60 * 1000

const LINK_MESSAGES = {
  [TOKEN_PURPOSES.passwordReset]: {
    invalid: 'This password reset link is not valid. Please request a new one.',
    expired: 'This password reset link has expired. Please request a new one.',
    used: 'This password reset link has already been used or replaced by a newer one. Please request a new one if you still need it.',
  },
  [TOKEN_PURPOSES.emailChange]: {
    invalid: 'This e-mail confirmation link is not valid. Please change your e-mail address again from Settings.',
    expired: 'This e-mail confirmation link has expired. Please change your e-mail address again from Settings.',
    used: 'This e-mail confirmation link has already been used or replaced by a newer one.',
  },
}

// A new single-use link of `purpose` for the user: every older open one stops working.
// Returns the token for the e-mail (it is stored only as a hash).
export const issueLink = async ({ userId, purpose, newEmail = null, ttlMinutes }, now, db) => {
  const { token, tokenHash } = createToken()
  await accountTokenModel.closeAllForUser(userId, purpose, now, db)
  await accountTokenModel.create(
    { userId, purpose, tokenHash, newEmail, createdAt: now, expiresAt: new Date(now.getTime() + ttlMinutes * MINUTE_MS) },
    db,
  )
  return token
}

// The stored link and its account when `token` can be used now; otherwise a 400 saying
// why (unknown, expired, used or replaced), with the code the page reacts to.
// `forUpdate` locks both rows for the surrounding transaction.
const findUsableLink = async (token, purpose, now, db, { forUpdate = false } = {}) => {
  const messages = LINK_MESSAGES[purpose]
  const fail = (reason) => new AppError(400, messages[reason], undefined, LINK_CODES[reason])
  const link = await accountTokenModel.findByHash(hashToken(token), db, { forUpdate })
  if (!link || link.purpose !== purpose) throw fail('invalid')
  if (link.used_at !== null) throw fail('used')
  if (link.expires_at.getTime() <= now.getTime()) throw fail('expired')
  const user = await userModel.findById(link.user_id, db, { forUpdate })
  // The account was deactivated since the link was sent: it cannot be used any more
  if (!user || user.status !== 'active') {
    throw new AppError(403, 'This account is inactive. Please contact the school.', undefined, LINK_CODES.invalid)
  }
  return { link, user }
}

// ---- Forgot password

// Sends a reset link to the account with this e-mail, if there is an active one. The caller
// gives the same answer whatever happens here, and does not wait for it (so the time taken
// does not tell either). A link is sent at most every PASSWORD_RESET_RESEND_SECONDS per
// account. A locked account may reset its password (it needs it to reapply) but stays locked.
export const requestPasswordReset = async ({ email }, now = new Date()) => {
  const user = await userModel.findByEmail(email)
  if (!user || user.status !== 'active') return { sent: false }

  const latest = await accountTokenModel.findLatestOpen(user.id, TOKEN_PURPOSES.passwordReset)
  if (latest && now.getTime() - latest.created_at.getTime() < PASSWORD_RESET_RESEND_SECONDS * 1000) {
    return { sent: false }
  }

  const token = await withTransaction((db) =>
    issueLink({ userId: user.id, purpose: TOKEN_PURPOSES.passwordReset, ttlMinutes: PASSWORD_RESET_TTL_MINUTES }, now, db),
  )
  await sendPasswordResetEmail(
    { email: user.email, name: user.name, drivingSchoolId: user.driving_school_id },
    { resetUrl: frontendUrl('/reset-password', { token }), expiryMinutes: PASSWORD_RESET_TTL_MINUTES },
  )
  return { sent: true }
}

// The reset page checks its link before asking for a password. The Driving School ID is
// shown because it is what the student logs in with.
export const checkPasswordResetLink = async ({ token }, now = new Date()) => {
  const { link, user } = await findUsableLink(token, TOKEN_PURPOSES.passwordReset, now)
  return { drivingSchoolId: user.driving_school_id, expiresAt: link.expires_at }
}

// Sets the new password and uses up the link, in one transaction: a second use (even at the
// same moment) finds it used. Every session of the account ends, so whoever knew the old
// password is signed out. The account's lock and status are left exactly as they are.
export const resetPassword = async ({ token, password }, now = new Date()) => {
  const passwordHash = await hashPassword(password)
  return withTransaction(async (db) => {
    const { user } = await findUsableLink(token, TOKEN_PURPOSES.passwordReset, now, db, { forUpdate: true })
    await userModel.updatePasswordHash(user.id, passwordHash, db)
    await accountTokenModel.closeAllForUser(user.id, TOKEN_PURPOSES.passwordReset, now, db)
    await userModel.incrementSessionVersion(user.id, db)
    return { drivingSchoolId: user.driving_school_id, locked: user.locked_at !== null }
  })
}

// ---- E-mail change (requested on the Settings page, see profileService.js)

// Sends the confirmation link to the new address. users.email is not touched.
export const sendEmailChangeLink = async (user, newEmail, now) => {
  const token = await withTransaction((db) =>
    issueLink(
      { userId: user.id, purpose: TOKEN_PURPOSES.emailChange, newEmail, ttlMinutes: EMAIL_CHANGE_TTL_MINUTES },
      now,
      db,
    ),
  )
  try {
    await sendEmailChangeVerification(
      { email: newEmail, name: user.name },
      { verificationUrl: frontendUrl('/verify-email', { token }), expiryMinutes: EMAIL_CHANGE_TTL_MINUTES },
    )
  } catch (error) {
    // A link nobody received must not stay pending
    await accountTokenModel.closeAllForUser(user.id, TOKEN_PURPOSES.emailChange, now)
    throw error
  }
}

const EMAIL_TAKEN = 'This e-mail address is now used by another account, so it cannot be confirmed. Please choose another address in Settings.'

// Opening the link: the new address becomes the account's e-mail. Checked again here (not
// only when it was requested) so an address another account has taken in the meantime is
// never given to a second account. Reset links sent to the old address stop working.
export const confirmEmailChange = async ({ token }, now = new Date()) => {
  try {
    return await withTransaction(async (db) => {
      const { link, user } = await findUsableLink(token, TOKEN_PURPOSES.emailChange, now, db, { forUpdate: true })
      const owner = await userModel.findByEmail(link.new_email, db)
      if (owner && owner.id !== user.id) throw new AppError(409, EMAIL_TAKEN)
      await userModel.updateEmail(user.id, link.new_email, db)
      await accountTokenModel.closeAllForUser(user.id, TOKEN_PURPOSES.emailChange, now, db)
      await accountTokenModel.closeAllForUser(user.id, TOKEN_PURPOSES.passwordReset, now, db)
      return { email: link.new_email }
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, EMAIL_TAKEN)
    throw error
  }
}
