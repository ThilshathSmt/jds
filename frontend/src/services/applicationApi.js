// Registration applications: the public Apply Now submission and the admin review actions.

import { API_URL, apiRequest } from './apiClient'

const ADMIN_PATH = '/api/admin/registration-forms'

// Public. Sends what the Apply Now form collected, with the receipt file, as multipart/form-data.
// Only the package id is sent: the backend looks up the price and sets the status itself.
// `quotedMinimumPayment` is the amount the form showed; the backend only compares it with
// its own and refuses (TERMS_CHANGED) when they differ, it never charges it.
export const submitApplication = async (formData) => {
  const body = new FormData()
  for (const field of ['fullName', 'mobile', 'email', 'nic', 'address', 'packageId', 'paymentMethod', 'quotedMinimumPayment']) {
    body.append(field, formData[field] ?? '')
  }
  body.append('receipt', formData.receipt)

  const { application } = await apiRequest('/api/registration-applications', { method: 'POST', body })
  return application
}

// Admin only from here on

// `status` is 'NEW', 'APPROVED', 'SUSPENDED', 'REJECTED' or '' for all; `type` is
// 'NEW_STUDENT' (first-time), 'REAPPLICATION' (after three failed examination attempts)
// or '' for both
export const listApplications = async (status = '', type = '') => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (type) params.set('type', type)
  const query = params.toString()
  const { applications } = await apiRequest(`${ADMIN_PATH}${query ? `?${query}` : ''}`)
  return applications
}

export const getApplication = async (id) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}`)
  return application
}

// Sends the approval e-mail (with the Driving School ID) again after it failed. Never
// issues another ID. Resolves with the updated application.
export const retryApprovalEmail = async (id) =>
  apiRequest(`${ADMIN_PATH}/${id}/approval-email`, { method: 'POST', withMessage: true })

export const approveApplication = async (id) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}/approve`, { method: 'POST' })
  return application
}

// Reapplications only: `reason` is shown to the student, whose account stays locked
export const rejectApplication = async (id, reason) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
  return application
}

export const suspendApplication = async (id) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}/suspend`, { method: 'POST' })
  return application
}

export const deleteApplication = (id) => apiRequest(`${ADMIN_PATH}/${id}`, { method: 'DELETE' })

// Link to an uploaded document. Opening it sends the admin's session cookie, and the
// backend refuses anyone who is not a signed-in admin.
export const getDocumentUrl = (applicationId, documentId, { download = false } = {}) =>
  `${API_URL}${ADMIN_PATH}/${applicationId}/documents/${documentId}${download ? '?download=1' : ''}`
