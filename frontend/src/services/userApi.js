// Admin Manage Users: student and instructor accounts. Every call is admin-only; the
// backend checks the session and role itself.

import { apiRequest } from './apiClient'

const ADMIN_PATH = '/api/admin/users'

// `filters` = { role, status, search, page, pageSize }; empty values are left out.
// Resolves with { users, pagination: { page, pageSize, total, totalPages } }.
export const listUsers = (filters = {}) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  const query = params.toString()
  return apiRequest(`${ADMIN_PATH}${query ? `?${query}` : ''}`)
}

export const getUser = async (id) => {
  const { user } = await apiRequest(`${ADMIN_PATH}/${id}`)
  return user
}

// For display in the form only: the backend issues the real ID when the account is saved
export const getNextInstructorId = async () => {
  const { drivingSchoolId } = await apiRequest(`${ADMIN_PATH}/next-instructor-id`)
  return drivingSchoolId
}

// No role or Driving School ID is sent: the backend sets both. `responsibility` is one of
// the codes in data/instructorData.js.
export const createInstructor = async ({ name, email, password, confirmPassword, responsibility }) => {
  const { user } = await apiRequest(`${ADMIN_PATH}/instructors`, {
    method: 'POST',
    body: { name, email, password, confirmPassword, responsibility },
  })
  return user
}

// Instructors only. Changes nothing else about the account. Resolves with the updated user.
export const updateResponsibility = async (id, responsibility) => {
  const { user } = await apiRequest(`${ADMIN_PATH}/${id}/responsibility`, {
    method: 'PUT',
    body: { responsibility },
  })
  return user
}

export const activateUser = async (id) => {
  const { user } = await apiRequest(`${ADMIN_PATH}/${id}/activate`, { method: 'POST' })
  return user
}

export const deactivateUser = async (id) => {
  const { user } = await apiRequest(`${ADMIN_PATH}/${id}/deactivate`, { method: 'POST' })
  return user
}

export const deleteUser = (id) => apiRequest(`${ADMIN_PATH}/${id}`, { method: 'DELETE' })
