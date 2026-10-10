// HTTP handling for the admin Manage Users page. Rules live in
// services/userManagementService.js.

import * as userManagementService from '../services/userManagementService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateInstructorInput,
  validateUserListQuery,
} from '../utils/validationUtils.js'

export const list = async (req, res) => {
  const result = await userManagementService.list(validateUserListQuery(req.query))
  sendSuccess(res, { message: 'Users', data: result })
}

export const getDetails = async (req, res) => {
  const user = await userManagementService.getDetails(parseId(req.params.id))
  sendSuccess(res, { message: 'User details', data: { user } })
}

export const getNextInstructorId = async (req, res) => {
  const drivingSchoolId = await userManagementService.getNextInstructorId()
  sendSuccess(res, { message: 'Next instructor Driving School ID', data: { drivingSchoolId } })
}

export const createInstructor = async (req, res) => {
  const user = await userManagementService.createInstructor(
    validateInstructorInput(req.body),
    req.user.id,
  )
  sendSuccess(res, {
    statusCode: 201,
    message: `Instructor account created. Driving School ID: ${user.drivingSchoolId}`,
    data: { user },
  })
}

export const activate = async (req, res) => {
  const user = await userManagementService.activate(parseId(req.params.id), req.user.id)
  sendSuccess(res, { message: `${user.name}'s account has been activated.`, data: { user } })
}

export const deactivate = async (req, res) => {
  const user = await userManagementService.deactivate(parseId(req.params.id), req.user.id)
  sendSuccess(res, { message: `${user.name}'s account has been deactivated.`, data: { user } })
}

export const remove = async (req, res) => {
  await userManagementService.remove(parseId(req.params.id), req.user.id)
  sendSuccess(res, { message: 'Account deleted.' })
}
