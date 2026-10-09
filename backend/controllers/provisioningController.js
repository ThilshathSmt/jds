// HTTP handling for admin Driving School ID provisioning.

import * as provisioningService from '../services/provisioningService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { validateProvisionInput } from '../utils/validationUtils.js'

export const createDrivingSchoolId = async (req, res) => {
  const { role } = validateProvisionInput(req.body)
  const drivingSchoolId = await provisioningService.provisionId({ role, createdBy: req.user.id })
  sendSuccess(res, {
    statusCode: 201,
    message: 'Driving School ID created',
    data: { drivingSchoolId },
  })
}

export const listDrivingSchoolIds = async (req, res) => {
  const drivingSchoolIds = await provisioningService.listIds()
  sendSuccess(res, { message: 'Driving School IDs', data: { drivingSchoolIds } })
}
