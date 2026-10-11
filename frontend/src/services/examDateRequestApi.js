// Requests for a physical driving licence exam date. The backend decides who the student
// is, which dates are acceptable and what an admin may approve; nothing sent from here can
// change that. A "request" below is
//   { id, studentName, drivingSchoolId, medicalReportSubmitted, preferredDates, status,
//     approvedDate, rejectionReasonCode, rejectionReason, reviewedAt, createdAt, updatedAt }
// with dates as 'YYYY-MM-DD' and `status` 'PENDING', 'APPROVED' or 'REJECTED'.

import { apiRequest } from './apiClient'

const STUDENT_PATH = '/api/student/exam-date-requests'
const ADMIN_PATH = '/api/admin/exam-date-requests'

// ---- Student

// Resolves with { requests, canSubmit }: the student's own requests, newest first
export const listMyExamDateRequests = () => apiRequest(STUDENT_PATH)

export const getMyExamDateRequest = async (id) => {
  const { request } = await apiRequest(`${STUDENT_PATH}/${id}`)
  return request
}

// `preferredDates` are one to three future Tuesdays, in the order of preference.
// Rejects with status 409 when a request is already awaiting review.
export const submitExamDateRequest = async ({ medicalReportSubmitted, preferredDates }) => {
  const { request } = await apiRequest(STUDENT_PATH, {
    method: 'POST',
    body: { medicalReportSubmitted, preferredDates },
  })
  return request
}

// ---- Admin only from here on

// `status` is 'PENDING', 'APPROVED', 'REJECTED' or '' for all
export const listExamDateRequests = async (status = '') => {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const { requests } = await apiRequest(`${ADMIN_PATH}${query}`)
  return requests
}

export const getExamDateRequest = async (id) => {
  const { request } = await apiRequest(`${ADMIN_PATH}/${id}`)
  return request
}

// `approvedDate` must be one of the request's preferred dates
export const approveExamDateRequest = async (id, approvedDate) => {
  const { request } = await apiRequest(`${ADMIN_PATH}/${id}/approve`, {
    method: 'POST',
    body: { approvedDate },
  })
  return request
}

// `reason` is one of the codes in rejectionReasons (examDateUtils.js); `otherReason` is
// the admin's own text, required for 'OTHER'
export const rejectExamDateRequest = async (id, { reason, otherReason }) => {
  const { request } = await apiRequest(`${ADMIN_PATH}/${id}/reject`, {
    method: 'POST',
    body: { reason, otherReason },
  })
  return request
}
