// The signed-in user's own Settings page, for every role. The backend works on the account
// of the session only: nothing sent from here can reach another account or change the
// Driving School ID, role or status. A "profile" is
//   { id, drivingSchoolId, name, email, role, profilePictureUrl, pendingEmail, pendingEmailExpiresAt }

import { API_URL, apiRequest } from './apiClient'

export const getProfile = async () => (await apiRequest('/api/profile')).profile

// Resolves with { profile, verificationSentTo, message }. A new e-mail address needs the
// current password and only replaces the old one once confirmed from the e-mail sent to it.
export const updateProfile = async ({ name, email, currentPassword }) => {
  const { profile, verificationSentTo, message } = await apiRequest('/api/profile', {
    method: 'PUT',
    body: { name, email, currentPassword },
    withMessage: true,
  })
  return { profile, verificationSentTo, message }
}

export const cancelEmailChange = async () =>
  (await apiRequest('/api/profile/email-change', { method: 'DELETE' })).profile

export const changePassword = ({ currentPassword, newPassword, confirmPassword }) =>
  apiRequest('/api/profile/password', { method: 'PUT', body: { currentPassword, newPassword, confirmPassword } })

export const uploadProfilePicture = async (file) => {
  const body = new FormData()
  body.append('picture', file)
  return (await apiRequest('/api/profile/picture', { method: 'POST', body })).profile
}

export const removeProfilePicture = async () =>
  (await apiRequest('/api/profile/picture', { method: 'DELETE' })).profile

// The picture is sent only with the session cookie, so it is fetched (not linked) and shown
// from a local object URL. Resolves with a Blob.
export const fetchProfilePicture = async (profilePictureUrl) => {
  const response = await fetch(`${API_URL}${profilePictureUrl}`, { credentials: 'include' })
  if (!response.ok) throw new Error('The profile picture could not be loaded.')
  return response.blob()
}
