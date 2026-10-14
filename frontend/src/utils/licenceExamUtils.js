// Display names and page addresses for the physical examination attempts and the
// reattempt payments. The codes are the backend's; the badge colours are in StatusBadge.

export const DATE_REQUEST_PATH = '/student-dashboard/exams/date-request'
export const REATTEMPT_PAYMENT_PATH = '/student-dashboard/exams/reattempt-payment'

export const resultLabels = { PENDING: 'Result pending', PASSED: 'Passed', FAILED: 'Failed' }

// Statuses of a reattempt request and of its payment and medical report
export const verificationLabels = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NOT_REQUIRED: 'Not required',
}

// Where the payment for the student's most recent failure stands (summary.paymentStatus)
export const paymentStatusLabels = {
  NOT_REQUIRED: 'No payment required',
  REQUIRED: 'Payment required',
  PENDING: 'Awaiting verification',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
}

export const reattemptDocumentLabels = {
  payment_receipt: 'Payment Receipt / Deposit Slip',
  medical_report: 'New Medical Report',
}

export const medicalReportLabels = {
  VALID: 'Valid for the current cycle',
  NEW_REQUIRED: 'New medical report required',
  UNDER_REVIEW: 'New report awaiting verification',
  NOT_NEEDED: 'No longer needed',
}

// 2000 -> 'LKR 2,000'
export const formatFee = (amount) => `LKR ${amount.toLocaleString('en-US')}`

// 'Attempt 2 of 3'
export const formatAttempt = (attemptNumber, attemptsPerCycle) =>
  `Attempt ${attemptNumber} of ${attemptsPerCycle}`

export const formatFileSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
