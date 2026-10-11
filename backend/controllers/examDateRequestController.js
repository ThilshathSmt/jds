// HTTP handling for physical exam date requests. Rules live in
// services/examDateRequestService.js. A student's request always belongs to req.user:
// the student id, name and Driving School ID never come from the request.

import * as examDateRequestService from '../services/examDateRequestService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateExamDateApprovalInput,
  validateExamDateRejectionInput,
  validateExamDateRequestInput,
  validateExamDateRequestStatusFilter,
} from '../utils/validationUtils.js'

// ---- Student: /api/student/exam-date-requests

export const listOwn = async (req, res) => {
  const data = await examDateRequestService.listOwn(req.user)
  sendSuccess(res, { message: 'Your exam date requests', data })
}

export const getOwn = async (req, res) => {
  const request = await examDateRequestService.getOwn(parseId(req.params.id), req.user)
  sendSuccess(res, { message: 'Exam date request', data: { request } })
}

export const submit = async (req, res) => {
  const request = await examDateRequestService.submit(
    req.user,
    validateExamDateRequestInput(req.body),
  )
  sendSuccess(res, {
    statusCode: 201,
    message: 'Your exam date request has been submitted and is awaiting admin review.',
    data: { request },
  })
}

// ---- Admin: /api/admin/exam-date-requests

export const list = async (req, res) => {
  const status = validateExamDateRequestStatusFilter(req.query.status)
  const requests = await examDateRequestService.list({ status })
  sendSuccess(res, { message: 'Exam date requests', data: { requests } })
}

export const getDetails = async (req, res) => {
  const request = await examDateRequestService.getDetails(parseId(req.params.id))
  sendSuccess(res, { message: 'Exam date request', data: { request } })
}

export const approve = async (req, res) => {
  const request = await examDateRequestService.approve(
    parseId(req.params.id),
    req.user.id,
    validateExamDateApprovalInput(req.body),
  )
  sendSuccess(res, { message: 'Exam date request approved.', data: { request } })
}

export const reject = async (req, res) => {
  const request = await examDateRequestService.reject(
    parseId(req.params.id),
    req.user.id,
    validateExamDateRejectionInput(req.body),
  )
  sendSuccess(res, { message: 'Exam date request rejected.', data: { request } })
}
