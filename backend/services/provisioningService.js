// Issuing Driving School IDs.
//   Students:    issued only when an admin approves a registration application
//                (see registrationApplicationService.approve) -> JDS_STD_0001
//   Instructors: issued directly by an admin, either with their account in one step
//                (see userManagementService.createInstructor) or on its own through
//                provisionId -> JDS_INS_0001

import { withTransaction } from '../config/database.js'
import * as drivingSchoolIdModel from '../models/drivingSchoolIdModel.js'
import * as idSequenceModel from '../models/idSequenceModel.js'

const ID_PREFIXES = { student: 'JDS_STD_', instructor: 'JDS_INS_' }
const NUMBER_WIDTH = 4

const toPublicId = (record) => ({
  id: record.id,
  drivingSchoolId: record.driving_school_id,
  role: record.role,
  status: record.status,
  createdAt: record.created_at,
})

const formatId = (prefix, number) => `${prefix}${String(number).padStart(NUMBER_WIDTH, '0')}`

// Issues the next ID for the role and records it as available for registration.
// `db` must be a transaction connection: the sequence counter stays locked until the
// caller's transaction ends, and the UNIQUE key on driving_school_id is a second guard.
export const issueDrivingSchoolId = async ({ role, createdBy }, db) => {
  const prefix = ID_PREFIXES[role]
  const number = await idSequenceModel.nextNumber(prefix, db)
  const drivingSchoolId = formatId(prefix, number)
  await drivingSchoolIdModel.create({ drivingSchoolId, role, createdBy }, db)
  return drivingSchoolId
}

// Admin action: issue an ID for a new instructor
export const provisionId = async ({ role, createdBy }) => {
  const drivingSchoolId = await withTransaction((db) => issueDrivingSchoolId({ role, createdBy }, db))
  return toPublicId(await drivingSchoolIdModel.findByDrivingSchoolId(drivingSchoolId))
}

export const listIds = async () => (await drivingSchoolIdModel.findAll()).map(toPublicId)

// The ID the next issue for `role` would most likely receive. For display only: nothing is
// reserved, so a simultaneous request can take it first and the issued ID is the real one.
export const previewNextId = async (role) => {
  const prefix = ID_PREFIXES[role]
  return formatId(prefix, await idSequenceModel.peekNextNumber(prefix))
}
