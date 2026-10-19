// HTTP handling for /api/profile: the signed-in user's own Settings page, for every role.
// Rules live in services/profileService.js. The account is always req.user: no route here
// takes a user id, so nobody can read or change another account through it.

import env from '../config/env.js'
import * as profileService from '../services/profileService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { SESSION_COOKIE, createSession, readSession } from '../utils/sessionUtils.js'
import { validateChangePasswordInput, validateProfileInput } from '../utils/validationUtils.js'

export const getProfile = async (req, res) => {
  const profile = await profileService.getProfile(req.user.id)
  sendSuccess(res, { message: 'Your profile', data: { profile } })
}

// PUT /api/profile { name, email, currentPassword? }
export const updateProfile = async (req, res) => {
  const { profile, verificationSentTo } = await profileService.updateProfile(
    req.user.id,
    validateProfileInput(req.body),
  )
  const message = verificationSentTo
    ? `Your changes have been saved. We sent a confirmation link to ${verificationSentTo}: your e-mail address will change once you open it.`
    : 'Your changes have been saved.'
  sendSuccess(res, { message, data: { profile, verificationSentTo } })
}

// DELETE /api/profile/email-change: withdraw the new address waiting for confirmation
export const cancelEmailChange = async (req, res) => {
  const profile = await profileService.cancelEmailChange(req.user.id)
  sendSuccess(res, { message: 'The e-mail change has been cancelled.', data: { profile } })
}

// PUT /api/profile/password { currentPassword, newPassword, confirmPassword }
// Every other session ends; this browser gets a new session cookie so it stays signed in
// the same way (with or without "keep me signed in").
export const changePassword = async (req, res) => {
  const { sessionVersion } = await profileService.changePassword(req.user.id, validateChangePasswordInput(req.body))
  const { keepSignedIn } = readSession(req.cookies?.[SESSION_COOKIE]) ?? {}
  const { token, cookieOptions } = createSession(req.user.id, sessionVersion, keepSignedIn)
  res.cookie(SESSION_COOKIE, token, cookieOptions)
  sendSuccess(res, { message: 'Your password has been changed. Other devices have been signed out.' })
}

// POST /api/profile/picture (multipart, field "picture")
export const uploadPicture = async (req, res) => {
  const profile = await profileService.setProfilePicture(req.user.id, req.file)
  sendSuccess(res, { message: 'Your profile picture has been updated.', data: { profile } })
}

export const removePicture = async (req, res) => {
  const profile = await profileService.removeProfilePicture(req.user.id)
  sendSuccess(res, { message: 'Your profile picture has been removed.', data: { profile } })
}

// GET /api/profile/picture: the image itself, only ever the signed-in user's own
export const getPicture = async (req, res) => {
  const { storedName, mimeType } = await profileService.getProfilePictureFile(req.user.id)
  res.sendFile(
    storedName,
    {
      root: env.profileUploadsDir,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=86400',
      },
    },
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ success: false, message: 'Profile picture not found.' })
      }
    },
  )
}
