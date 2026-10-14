// HTTP handling for the physical examination attempts and the reattempt payments that
// follow a failed attempt. Rules live in services/licenceExamService.js and
// services/examReattemptRequestService.js. A student's records always belong to req.user.

import env from '../config/env.js'
import * as examReattemptRequestService from '../services/examReattemptRequestService.js'
import { removeFile } from '../utils/fileUtils.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateExamDateRequestStatusFilter,
  validateRejectionReasonInput,
  validateReattemptRequestInput,
} from '../utils/validationUtils.js'

// Sends an uploaded file itself. `?download=1` saves it instead of showing it.
const sendDocument = (req, res, file) => {
  const disposition = req.query.download ? 'attachment' : 'inline'
  res.sendFile(
    file.storedName,
    {
      root: env.reattemptUploadsDir,
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

const removeFiles = (files) => Promise.all(files.map((file) => removeFile(file.path)))

// ---- Student: /api/student/licence-exam

export const getOverview = async (req, res) => {
  const data = await examReattemptRequestService.getOverview(req.user)
  sendSuccess(res, { message: 'Your examination attempts', data })
}

// multipart/form-data: paymentMethod and receipt (file). Which failure it pays for is
// decided by the server.
export const submit = async (req, res) => {
  const uploaded = Object.values(req.files ?? {}).flat()
  try {
    const { request, unusedFiles } = await examReattemptRequestService.submit(
      req.user,
      validateReattemptRequestInput(req.body),
      req.files,
    )
    await removeFiles(unusedFiles)
    sendSuccess(res, {
      statusCode: 201,
      message: 'Your reattempt payment has been submitted for verification.',
      data: { request },
    })
  } catch (error) {
    // Nothing was saved, so do not keep the uploaded files
    await removeFiles(uploaded)
    throw error
  }
}

export const getOwn = async (req, res) => {
  const request = await examReattemptRequestService.getOwn(parseId(req.params.id), req.user)
  sendSuccess(res, { message: 'Reattempt payment', data: { request } })
}

export const getOwnDocument = async (req, res) => {
  const file = await examReattemptRequestService.getOwnDocumentFile(
    parseId(req.params.id),
    parseId(req.params.documentId),
    req.user,
  )
  sendDocument(req, res, file)
}

// ---- Admin: /api/admin/exam-reattempt-requests

export const list = async (req, res) => {
  const status = validateExamDateRequestStatusFilter(req.query.status)
  const requests = await examReattemptRequestService.list({ status })
  sendSuccess(res, { message: 'Reattempt payments', data: { requests } })
}

export const getDetails = async (req, res) => {
  const request = await examReattemptRequestService.getDetails(parseId(req.params.id))
  sendSuccess(res, { message: 'Reattempt payment', data: { request } })
}

export const approve = async (req, res) => {
  const request = await examReattemptRequestService.approve(parseId(req.params.id), req.user.id)
  sendSuccess(res, { message: 'Reattempt payment approved.', data: { request } })
}

export const reject = async (req, res) => {
  const request = await examReattemptRequestService.reject(
    parseId(req.params.id),
    req.user.id,
    validateRejectionReasonInput(req.body),
  )
  sendSuccess(res, { message: 'Reattempt payment rejected.', data: { request } })
}

export const getDocument = async (req, res) => {
  const file = await examReattemptRequestService.getDocumentFile(
    parseId(req.params.id),
    parseId(req.params.documentId),
  )
  sendDocument(req, res, file)
}
