// HTTP handling for reapplications: the new application of a student whose account is
// locked after three failed examination attempts. Rules live in
// services/reapplicationService.js.
// The public handlers identify the student by the Driving School ID and password sent
// with every request: a locked student has no session.

import * as reapplicationService from '../services/reapplicationService.js'
import { removeFile } from '../utils/fileUtils.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateReapplicationCredentials,
  validateReapplicationInput,
} from '../utils/validationUtils.js'

const removeFiles = (files) => Promise.all(files.map((file) => removeFile(file.path)))

// Public: POST /api/reapplications/status { drivingSchoolId, password }
export const getStatus = async (req, res) => {
  const status = await reapplicationService.getStatus(validateReapplicationCredentials(req.body))
  sendSuccess(res, { message: 'Reapplication status', data: status })
}

// Public: POST /api/reapplications (multipart/form-data): the credentials, the
// application details, the package and payment method, medicalReport (file) and receipt
// (file: the registration payment for the package)
export const submit = async (req, res) => {
  const uploaded = Object.values(req.files ?? {}).flat()
  try {
    const { status, unusedFiles } = await reapplicationService.submit(
      validateReapplicationCredentials(req.body),
      validateReapplicationInput(req.body),
      req.files,
    )
    await removeFiles(unusedFiles)
    sendSuccess(res, {
      statusCode: 201,
      message: 'Your new application has been submitted. Your account stays locked until the school approves it.',
      data: status,
    })
  } catch (error) {
    // Nothing was saved, so do not keep the uploaded files
    await removeFiles(uploaded)
    throw error
  }
}

// Student (signed in again): GET /api/student/reapplications/:id
export const getOwn = async (req, res) => {
  const application = await reapplicationService.getOwn(parseId(req.params.id), req.user)
  sendSuccess(res, { message: 'Reapplication', data: { application } })
}
