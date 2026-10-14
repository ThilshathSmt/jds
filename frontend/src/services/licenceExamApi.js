// The physical driving licence examination: attempts, results and the reattempt payment
// that a first or second failed attempt of a cycle requires. The backend counts the attempts, knows what is owed
// and decides what a student may do next; nothing sent from here can change that.
//
// A "summary" is { status, message, cycleNumber, attemptsPerCycle, attemptsUsed,
//   attemptsRemaining, nextAttemptNumber, passed, lastResult, canRequestDate,
//   canPayReattemptFee, reattemptFee, paymentStatus, medicalReportRequired, medicalReport,
//   failedAttempt, reattemptRequestId, activeRequest }.
// A "reattempt request" is one payment for one failed attempt: { id, studentName,
//   drivingSchoolId, cycleNumber, attemptNumber, attemptsPerCycle, examDate, previousResult,
//   medicalReportRequired, newCycleNumber, feeAmount, paymentMethod, status, paymentStatus,
//   medicalReportStatus, rejectionReason, reviewedAt, createdAt,
//   documents: [{ id, type, originalName, mimeType, sizeBytes }] }.

import { API_URL, apiRequest } from './apiClient'

const STUDENT_PATH = '/api/student/licence-exam'
const ADMIN_RESULT_PATH = '/api/admin/exam-date-requests'
const ADMIN_REATTEMPT_PATH = '/api/admin/exam-reattempt-requests'

// ---- Student

// Resolves with { summary, attempts, reattemptRequests }: where the student stands, every
// recorded attempt (oldest first) and their reattempt payments (newest first)
export const getMyLicenceExam = () => apiRequest(STUDENT_PATH)

export const getMyReattemptRequest = async (id) => {
  const { request } = await apiRequest(`${STUDENT_PATH}/reattempt-requests/${id}`)
  return request
}

// Sends the payment receipt (and the new medical report, when one is required) as
// multipart/form-data. Only the payment method is sent with them: the backend decides
// which failed attempt it pays for, the fee and every status.
// Rejects with status 409 when the student has nothing to pay now.
export const submitReattemptRequest = async ({ paymentMethod, receipt, medicalReport }) => {
  const body = new FormData()
  body.append('paymentMethod', paymentMethod)
  body.append('receipt', receipt)
  if (medicalReport) body.append('medicalReport', medicalReport)
  const { request } = await apiRequest(`${STUDENT_PATH}/reattempt-requests`, { method: 'POST', body })
  return request
}

// ---- Admin only from here on

// `result` is 'PASSED' or 'FAILED'. Resolves with the updated exam date request.
// Rejects with status 409 when the result was already recorded.
export const recordExamResult = async (examDateRequestId, result) => {
  const { request } = await apiRequest(`${ADMIN_RESULT_PATH}/${examDateRequestId}/result`, {
    method: 'POST',
    body: { result },
  })
  return request
}

// `status` is 'PENDING', 'APPROVED', 'REJECTED' or '' for all
export const listReattemptRequests = async (status = '') => {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const { requests } = await apiRequest(`${ADMIN_REATTEMPT_PATH}${query}`)
  return requests
}

// The request plus `attempts` (the student's history) and `attemptSummary`
export const getReattemptRequest = async (id) => {
  const { request } = await apiRequest(`${ADMIN_REATTEMPT_PATH}/${id}`)
  return request
}

export const approveReattemptRequest = async (id) => {
  const { request } = await apiRequest(`${ADMIN_REATTEMPT_PATH}/${id}/approve`, { method: 'POST' })
  return request
}

// `rejectPayment` / `rejectMedicalReport` say what was not acceptable
export const rejectReattemptRequest = async (id, { rejectMedicalReport, rejectPayment, reason }) => {
  const { request } = await apiRequest(`${ADMIN_REATTEMPT_PATH}/${id}/reject`, {
    method: 'POST',
    body: { rejectMedicalReport, rejectPayment, reason },
  })
  return request
}

// Link to an uploaded document. Opening it sends the session cookie; the backend only
// serves it to an admin, or to the student the payment belongs to (`role`).
export const getReattemptDocumentUrl = (role, requestId, documentId, { download = false } = {}) => {
  const base = role === 'admin' ? ADMIN_REATTEMPT_PATH : `${STUDENT_PATH}/reattempt-requests`
  return `${API_URL}${base}/${requestId}/documents/${documentId}${download ? '?download=1' : ''}`
}
