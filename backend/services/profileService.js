// Business rules for the Settings page, the same for students, instructors and admins.
// Every function works on `userId`, which is always req.user.id: the signed-in account,
// never an id from the request, so nobody can reach another account's profile here.
//
//   - The Driving School ID, role, status and lock are never changed here.
//   - A new e-mail address only replaces the current one once it is confirmed from the
//     e-mail sent to it (see accountService.js), and asking for it needs the current password.
//   - Changing the password needs the current one, and ends every other session.
//
// Every function takes `now` last. Callers leave it out; tests pass a fixed time.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import env from '../config/env.js'
import { PROFILE_PICTURE_TYPES, TOKEN_PURPOSES } from '../config/account.js'
import * as accountTokenModel from '../models/accountTokenModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { isGenuineImage, removeFile } from '../utils/fileUtils.js'
import { hashPassword, verifyPassword } from '../utils/passwordUtils.js'
import { sendEmailChangeLink } from './accountService.js'
import { toPublicUser } from './authService.js'

const NOT_FOUND = 'Account not found.'
const WRONG_PASSWORD = 'Current password is incorrect.'

const findAccount = async (userId, db, options) => {
  const user = await userModel.findById(userId, db, options)
  if (!user) throw new AppError(404, NOT_FOUND)
  return user
}

// What the Settings page shows: the public user plus the address waiting for confirmation
// (if a confirmation link was sent and can still be used)
export const getProfile = async (userId, now = new Date()) => {
  const user = await findAccount(userId)
  const pending = await accountTokenModel.findLatestOpen(userId, TOKEN_PURPOSES.emailChange)
  const waiting = pending && pending.expires_at.getTime() > now.getTime()
  return {
    ...toPublicUser(user),
    pendingEmail: waiting ? pending.new_email : null,
    pendingEmailExpiresAt: waiting ? pending.expires_at : null,
  }
}

// `input` is { name, email, currentPassword }, already validated. The name is saved now; a
// different e-mail is only sent a confirmation link. Returns the profile and the address
// the link was sent to (null when the e-mail did not change).
export const updateProfile = async (userId, { name, email, currentPassword }, now = new Date()) => {
  const user = await findAccount(userId)
  const emailChanged = email !== user.email.toLowerCase()

  if (emailChanged) {
    // Whoever has a signed-in browser must not be able to move the account to their own
    // mailbox (and then reset its password) without knowing the password
    if (!currentPassword) {
      const message = 'Enter your current password to change your e-mail address.'
      throw new AppError(400, message, { currentPassword: message })
    }
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      throw new AppError(400, WRONG_PASSWORD, { currentPassword: WRONG_PASSWORD })
    }
    const owner = await userModel.findByEmail(email)
    if (owner && owner.id !== user.id) {
      const message = 'This e-mail address is already used by another account.'
      throw new AppError(409, message, { email: message })
    }
  }

  if (name !== user.name) await userModel.updateName(userId, name)
  if (emailChanged) {
    try {
      await sendEmailChangeLink({ id: userId, name }, email, now)
    } catch (error) {
      if (error instanceof AppError) throw error
      console.error(`E-mail change verification could not be sent: ${error.message}`)
      throw new AppError(
        502,
        'Your other changes were saved, but the confirmation e-mail could not be sent. Please try again later.',
      )
    }
  }
  return { profile: await getProfile(userId, now), verificationSentTo: emailChanged ? email : null }
}

// Withdraws a pending new e-mail address: its confirmation link stops working
export const cancelEmailChange = async (userId, now = new Date()) => {
  await accountTokenModel.closeAllForUser(userId, TOKEN_PURPOSES.emailChange, now)
  return getProfile(userId, now)
}

// Checks the current password, saves the new one (hashed) and ends every session of the
// account, including password reset links still open. Returns the new session version so the
// caller can keep this browser signed in.
export const changePassword = async (userId, { currentPassword, newPassword }, now = new Date()) => {
  const user = await findAccount(userId)
  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    throw new AppError(400, WRONG_PASSWORD, { currentPassword: WRONG_PASSWORD })
  }
  const passwordHash = await hashPassword(newPassword)
  return withTransaction(async (db) => {
    const locked = await findAccount(userId, db, { forUpdate: true })
    await userModel.updatePasswordHash(userId, passwordHash, db)
    await userModel.incrementSessionVersion(userId, db)
    await accountTokenModel.closeAllForUser(userId, TOKEN_PURPOSES.passwordReset, now, db)
    return { sessionVersion: locked.session_version + 1 }
  })
}

// ---- Profile picture

const picturePath = (storedName) => path.join(env.profileUploadsDir, path.basename(storedName))

// `file` is the upload multer saved (see uploadMiddleware.js). Replaces the previous picture,
// whose file is deleted once the new one is saved. The upload is deleted on any failure.
export const setProfilePicture = async (userId, file) => {
  if (!file) {
    const message = 'Please choose a picture to upload.'
    throw new AppError(400, message, { picture: message })
  }
  try {
    const mimeType = PROFILE_PICTURE_TYPES[path.extname(file.filename).toLowerCase()]
    if (!mimeType || !(await isGenuineImage(file.path, mimeType))) {
      const message = 'The file is not a valid JPG, PNG or WebP image.'
      throw new AppError(400, message, { picture: message })
    }
    const previous = await withTransaction(async (db) => {
      const user = await findAccount(userId, db, { forUpdate: true })
      await userModel.updateProfilePicture(userId, file.filename, db)
      return user.profile_picture
    })
    if (previous) await removeFile(picturePath(previous))
  } catch (error) {
    await removeFile(file.path)
    throw error
  }
  return getProfile(userId)
}

export const removeProfilePicture = async (userId) => {
  const previous = await withTransaction(async (db) => {
    const user = await findAccount(userId, db, { forUpdate: true })
    await userModel.updateProfilePicture(userId, null, db)
    return user.profile_picture
  })
  if (previous) await removeFile(picturePath(previous))
  return getProfile(userId)
}

// The signed-in user's own picture: { storedName, mimeType }
export const getProfilePictureFile = async (userId) => {
  const user = await findAccount(userId)
  const mimeType = user.profile_picture && PROFILE_PICTURE_TYPES[path.extname(user.profile_picture).toLowerCase()]
  if (!mimeType) throw new AppError(404, 'No profile picture has been uploaded.')
  return { storedName: path.basename(user.profile_picture), mimeType }
}
