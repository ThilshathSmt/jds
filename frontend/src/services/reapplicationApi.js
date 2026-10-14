// Reapplications: the new registration application a student must submit after failing
// all three examination attempts, while their account is locked.
//
// A locked student cannot log in, so these calls carry the Driving School ID and password
// (`credentials`) every time; the backend checks them before answering anything. They are
// kept in memory by the page for as long as it is open, never stored.
//
// A "status" is { student: { name, drivingSchoolId }, attemptsPerCycle,
//   applicationStatus: 'NONE' | 'NEW' | 'REJECTED', application: { id, status,
//   rejectionReason, createdAt, reviewedAt } | null, canSubmit, lockedAt,
//   details: { fullName, mobile, email, nic, address } | null }.

import { apiRequest } from './apiClient'

const PATH = '/api/reapplications'

// Rejects with status 401 for a wrong ID or password, and 409 when the account is not
// locked (nothing to reapply for)
export const getReapplicationStatus = ({ drivingSchoolId, password }) =>
  apiRequest(`${PATH}/status`, { method: 'POST', body: { drivingSchoolId, password } })

// Sends the application as multipart/form-data: the details, the chosen package, the
// payment method, the new medical report and the registration payment receipt. Nothing
// else is sent: the backend links it to the existing account and sets the price, the
// minimum payment and every status itself. Resolves with the new status.
export const submitReapplication = ({ credentials, formData }) => {
  const body = new FormData()
  body.append('drivingSchoolId', credentials.drivingSchoolId)
  body.append('password', credentials.password)
  for (const field of ['fullName', 'mobile', 'email', 'nic', 'address', 'packageId', 'paymentMethod']) {
    body.append(field, formData[field])
  }
  body.append('medicalReport', formData.medicalReport)
  body.append('receipt', formData.receipt)
  return apiRequest(PATH, { method: 'POST', body })
}

// Signed in again: one of the student's own reapplications, for the notification about it.
// Resolves with { id, status, rejectionReason, createdAt, reviewedAt, drivingSchoolId }.
export const getMyReapplication = async (id) => {
  const { application } = await apiRequest(`/api/student/reapplications/${id}`)
  return application
}
