// Business rules for the admin Manage Users page: listing student and instructor
// accounts, creating instructors, activating / deactivating and deleting accounts.
// Admin accounts are never managed here, and an admin can never act on their own account.

import { withTransaction } from '../config/database.js'
import * as drivingSchoolIdModel from '../models/drivingSchoolIdModel.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { hashPassword } from '../utils/passwordUtils.js'
import { MANAGED_ROLES } from '../utils/validationUtils.js'
import { issueDrivingSchoolId, previewNextId } from './provisioningService.js'

const NOT_FOUND = 'User not found.'
const DUPLICATE_EMAIL = 'An account with this e-mail address already exists.'

// The user fields the admin pages see. Never the password hash.
const toManagedUser = (row) => ({
  id: row.id,
  drivingSchoolId: row.driving_school_id,
  name: row.name,
  email: row.email,
  role: row.role,
  status: row.status,
  createdAt: row.created_at,
})

const toApplicationSummary = (row) => ({
  id: row.id,
  status: row.status,
  packageName: row.package_name,
  mobileNumber: row.mobile_number,
  approvedAt: row.approved_at,
})

// Loads a student / instructor for an admin action. The lookup is the same for a missing
// user and an admin account, so this feature cannot be used to probe admin accounts.
const findManagedUser = async (id, db, options) => {
  const user = await userModel.findById(id, db, options)
  if (!user || !MANAGED_ROLES.includes(user.role)) throw new AppError(404, NOT_FOUND)
  return user
}

// Admin accounts are never managed here, but guard against acting on oneself regardless
const assertNotSelf = (id, adminId, action) => {
  if (id === adminId) throw new AppError(403, `You cannot ${action} your own account.`)
}

export const list = async ({ role, status, search, page, pageSize }) => {
  const { rows, total } = await userModel.findPage({
    roles: role ? [role] : MANAGED_ROLES,
    status,
    search,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })
  return {
    users: rows.map(toManagedUser),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

// The account plus, for a student, the registration application their ID was issued for
export const getDetails = async (id) => {
  const user = await findManagedUser(id)
  const application =
    user.role === 'student'
      ? await applicationModel.findByDrivingSchoolId(user.driving_school_id)
      : null
  return {
    ...toManagedUser(user),
    updatedAt: user.updated_at,
    application: application ? toApplicationSummary(application) : null,
  }
}

export const getNextInstructorId = () => previewNextId('instructor')

// Creates an instructor account with a newly issued JDS_INS_ ID in one transaction:
// the ID, its registry record and the account are all saved, or nothing is (a rollback
// also restores the sequence counter). The role is always 'instructor'.
export const createInstructor = async ({ name, email, password }, adminId) => {
  // Hash before the transaction so the sequence row is not locked during the slow hash
  const passwordHash = await hashPassword(password)

  let userId
  try {
    userId = await withTransaction(async (db) => {
      if (await userModel.findByEmail(email, db)) {
        throw new AppError(409, DUPLICATE_EMAIL, { email: DUPLICATE_EMAIL })
      }
      const drivingSchoolId = await issueDrivingSchoolId(
        { role: 'instructor', createdBy: adminId },
        db,
      )
      const newUserId = await userModel.create(
        { drivingSchoolId, name, email, passwordHash, role: 'instructor' },
        db,
      )
      const idRecord = await drivingSchoolIdModel.findByDrivingSchoolId(drivingSchoolId, db)
      await drivingSchoolIdModel.markAssigned(idRecord.id, newUserId, db)
      return newUserId
    })
  } catch (error) {
    // Two requests with the same e-mail at the same moment: the UNIQUE key stops the second
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('uq_users_email')) {
      throw new AppError(409, DUPLICATE_EMAIL, { email: DUPLICATE_EMAIL })
    }
    throw error
  }

  return toManagedUser(await userModel.findById(userId))
}

export const activate = async (id, adminId) => {
  assertNotSelf(id, adminId, 'activate')
  await withTransaction(async (db) => {
    const user = await findManagedUser(id, db, { forUpdate: true })
    if (user.status === 'active') throw new AppError(409, 'This account is already active.')
    await userModel.updateStatus(id, 'active', db)
  })
  return getDetails(id)
}

// Blocks login and ends every existing session of the account: the auth middleware
// rejects inactive accounts, and the session version change keeps old tokens invalid
// even if the account is activated again later.
export const deactivate = async (id, adminId) => {
  assertNotSelf(id, adminId, 'deactivate')
  await withTransaction(async (db) => {
    const user = await findManagedUser(id, db, { forUpdate: true })
    if (user.status === 'inactive') throw new AppError(409, 'This account is already inactive.')
    await userModel.updateStatus(id, 'inactive', db)
    await userModel.incrementSessionVersion(id, db)
  })
  return getDetails(id)
}

// Deletes the login account only. What is kept:
//   - the registration application and its receipts (the student's history)
//   - the Driving School ID record, marked 'revoked' and unlinked, so the ID can never be
//     registered again and is never reissued. The sequence counter is not touched.
export const remove = async (id, adminId) => {
  assertNotSelf(id, adminId, 'delete')
  await withTransaction(async (db) => {
    await findManagedUser(id, db, { forUpdate: true })
    const idRecord = await drivingSchoolIdModel.findByUserId(id, db, { forUpdate: true })
    if (idRecord) await drivingSchoolIdModel.revokeAndUnlink(idRecord.id, db)
    await userModel.remove(id, db)
  })
}
