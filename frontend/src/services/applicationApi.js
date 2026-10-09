// Registration applications: the public Apply Now submission and the admin review actions.

import { API_URL, apiRequest } from './apiClient'

const ADMIN_PATH = '/api/admin/registration-forms'

// Public. Sends what the Apply Now form collected, with the receipt file, as multipart/form-data.
// Only the package id is sent: the backend looks up the price and sets the status itself.
export const submitApplication = async (formData) => {
  const body = new FormData()
  for (const field of ['fullName', 'mobile', 'email', 'nic', 'address', 'packageId', 'paymentMethod']) {
    body.append(field, formData[field])
  }
  body.append('receipt', formData.receipt)

  const { application } = await apiRequest('/api/registration-applications', { method: 'POST', body })
  return application
}

// Admin only from here on

// `status` is 'NEW', 'APPROVED', 'SUSPENDED' or '' for all
export const listApplications = async (status = '') => {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const { applications } = await apiRequest(`${ADMIN_PATH}${query}`)
  return applications
}

export const getApplication = async (id) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}`)
  return application
}

export const approveApplication = async (id) => {
  const { application } = await apiRequest(`${ADMIN_PATH}/${id}/approve`, { method: 'POST' })
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
