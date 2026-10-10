// Authentication business rules: who may register, who may log in and what a client may see.

import { withTransaction } from '../config/database.js'
import * as drivingSchoolIdModel from '../models/drivingSchoolIdModel.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { getDummyHash, hashPassword, verifyPassword } from '../utils/passwordUtils.js'

// The only user fields that ever leave the server. Never the password hash.
export const toPublicUser = (user) => ({
  id: user.id,
  drivingSchoolId: user.driving_school_id,
  name: user.name,
  email: user.email,
  role: user.role,
})

const ID_UNAVAILABLE_MESSAGES = {
  assigned: 'This Driving School ID has already been registered.',
  revoked: 'This Driving School ID is no longer valid. Please contact the school.',
}

// Registers a user against an ID the school has issued. An ID works exactly once.
// The role comes from the issued ID, never from the request.
export const register = async ({ drivingSchoolId, name, email, password }) => {
  const passwordHash = await hashPassword(password)

  const userId = await withTransaction(async (db) => {
    const idRecord = await drivingSchoolIdModel.findByDrivingSchoolId(drivingSchoolId, db, {
      forUpdate: true,
    })
    if (!idRecord) {
      throw new AppError(
        404,
        'Driving School ID not found. Please use the ID given to you by the school.',
      )
    }
    // Admin accounts are created by the seeder only, never through public registration
    if (idRecord.role === 'admin') {
      throw new AppError(403, 'This Driving School ID cannot be used for registration.')
    }
    if (idRecord.status !== 'available') {
      const status = idRecord.status === 'revoked' ? 403 : 409
      throw new AppError(status, ID_UNAVAILABLE_MESSAGES[idRecord.status])
    }
    // A student ID is only valid while it belongs to an APPROVED application
    if (idRecord.role === 'student') {
      const application = await applicationModel.findByDrivingSchoolId(
        idRecord.driving_school_id,
        db,
      )
      if (application?.status !== 'APPROVED') {
        throw new AppError(403, 'This Driving School ID is not valid for registration.')
      }
    }
    if (await userModel.findByEmail(email, db)) {
      throw new AppError(409, 'An account with this e-mail address already exists.')
    }

    const newUserId = await userModel.create(
      {
        // Use the ID exactly as the school issued it
        drivingSchoolId: idRecord.driving_school_id,
        name,
        email,
        passwordHash,
        role: idRecord.role,
      },
      db,
    )
    await drivingSchoolIdModel.markAssigned(idRecord.id, newUserId, db)
    return newUserId
  })

  return toPublicUser(await userModel.findById(userId))
}

// Returns the public user and the session version to put in the login token
export const login = async ({ drivingSchoolId, password }) => {
  const user = await userModel.findByDrivingSchoolId(drivingSchoolId)
  const passwordMatches = await verifyPassword(
    password,
    user ? user.password_hash : await getDummyHash(),
  )
  // Same message for an unknown ID and a wrong password, so IDs cannot be guessed
  if (!user || !passwordMatches) {
    throw new AppError(401, 'Invalid Driving School ID or password.')
  }
  if (user.status !== 'active') {
    throw new AppError(403, 'This account is inactive. Please contact the school.')
  }
  return { user: toPublicUser(user), sessionVersion: user.session_version }
}

// Used by the auth middleware on every protected request. Returns null when the
// account no longer exists, has been deactivated, or was deactivated after the token
// was issued (its session version has moved on).
export const getActiveUserById = async (userId, sessionVersion) => {
  const user = await userModel.findById(userId)
  const valid = user && user.status === 'active' && user.session_version === sessionVersion
  return valid ? toPublicUser(user) : null
}
