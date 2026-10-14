// Packages and school settings. The registration forms read the active packages and the
// advance payment rule (public); the "Packages & Exam Penalties" admin page changes them.

import { apiRequest } from './apiClient'

// The code the backend sends when the amount shown to the student has changed on the
// server since the form was loaded: the form reloads the options and asks them to review
export const TERMS_CHANGED = 'REGISTRATION_TERMS_CHANGED'

// Public. Resolves with { packages: [{ id, name, price }], advancePaymentPercent,
// fullPaymentThreshold }
export const getRegistrationOptions = () => apiRequest('/api/registration-applications/options')

// Admin only from here on. "settings" is { packages: [{ id, name, price, isActive,
// updatedAt }], advancePaymentPercent, reattemptFee, fullPaymentThreshold, settingsUpdatedAt }

export const getAdminSettings = () => apiRequest('/api/admin/settings')

// `changes` is any of { advancePaymentPercent, reattemptFee }. Resolves with the settings.
export const updateSettings = (changes) => apiRequest('/api/admin/settings', { method: 'PUT', body: changes })

export const createPackage = async ({ name, price, isActive }) =>
  (await apiRequest('/api/admin/packages', { method: 'POST', body: { name, price, isActive } })).package

export const updatePackage = async (id, { name, price, isActive }) =>
  (await apiRequest(`/api/admin/packages/${id}`, { method: 'PUT', body: { name, price, isActive } })).package
