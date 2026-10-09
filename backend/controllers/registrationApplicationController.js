// HTTP handling for registration applications. Rules live in the service.

import env from '../config/env.js'
import * as applicationService from '../services/registrationApplicationService.js'
import AppError from '../utils/AppError.js'
import { removeFile } from '../utils/fileUtils.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateApplicationInput,
  validateApplicationStatusFilter,
} from '../utils/validationUtils.js'

// Public: POST /api/registration-applications (multipart/form-data)
export const submit = async (req, res) => {
  try {
    const input = validateApplicationInput(req.body)
    if (!req.file) {
      const message = 'Please upload the payment receipt/document.'
      throw new AppError(400, message, { receipt: message })
    }
    const application = await applicationService.submit(input, req.file)
    sendSuccess(res, {
      statusCode: 201,
      message: 'Your registration form has been submitted.',
      data: { application },
    })
  } catch (error) {
    // Nothing was saved, so do not keep the uploaded file
    if (req.file) await removeFile(req.file.path)
    throw error
  }
}

export const list = async (req, res) => {
  const status = validateApplicationStatusFilter(req.query.status)
  const applications = await applicationService.list({ status })
  sendSuccess(res, { message: 'Registration applications', data: { applications } })
}

export const getDetails = async (req, res) => {
  const application = await applicationService.getDetails(parseId(req.params.id))
  sendSuccess(res, { message: 'Registration application', data: { application } })
}

export const approve = async (req, res) => {
  const application = await applicationService.approve(parseId(req.params.id), req.user.id)
  sendSuccess(res, {
    message: `Application approved. Driving School ID ${application.drivingSchoolId} issued.`,
    data: { application },
  })
}

export const suspend = async (req, res) => {
  const application = await applicationService.suspend(parseId(req.params.id))
  sendSuccess(res, { message: 'Application suspended.', data: { application } })
}

export const remove = async (req, res) => {
  await applicationService.remove(parseId(req.params.id))
  sendSuccess(res, { message: 'Application deleted.' })
}

// Sends the uploaded file itself. `?download=1` saves it instead of showing it.
export const getDocument = async (req, res) => {
  const file = await applicationService.getDocumentFile(
    parseId(req.params.id),
    parseId(req.params.documentId),
  )
  const disposition = req.query.download ? 'attachment' : 'inline'

  res.sendFile(
    file.storedName,
    {
      root: env.applicationUploadsDir,
      dotfiles: 'allow',
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `${disposition}; filename="${file.downloadName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    },
    (error) => {
      if (error && !res.headersSent) {
        res.status(404).json({ success: false, message: 'Document file not found.' })
      }
    },
  )
}
