import { ApiError, apiRequest } from './apiClient'

// The forms call the ID field `schoolId`; the API calls it `drivingSchoolId`
const toFormFieldErrors = ({ drivingSchoolId, ...rest } = {}) => ({
  ...rest,
  ...(drivingSchoolId ? { schoolId: drivingSchoolId } : {}),
})

const withFormFieldErrors = async (request) => {
  try {
    return await request
  } catch (error) {
    if (error instanceof ApiError) error.fieldErrors = toFormFieldErrors(error.fieldErrors)
    throw error
  }
}

export const login = async ({ schoolId, password, keepSignedIn }) => {
  const { user } = await withFormFieldErrors(
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: { drivingSchoolId: schoolId, password, keepSignedIn },
    }),
  )
  return user
}

// "Verify ID": resolves with { drivingSchoolId, name, email } of the approved application.
// Rejects with code ALREADY_REGISTERED when the ID already has an account.
export const verifyDrivingSchoolId = async (schoolId) => {
  const { details } = await withFormFieldErrors(
    apiRequest('/api/auth/register/verify', { method: 'POST', body: { drivingSchoolId: schoolId } }),
  )
  return details
}

// Only the ID and the password are sent: the backend takes the name and e-mail from the
// approved application and the role from the issued Driving School ID
export const register = async ({ schoolId, password, confirmPassword }) => {
  const { user } = await withFormFieldErrors(
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: { drivingSchoolId: schoolId, password, confirmPassword },
    }),
  )
  return user
}

// The signed-in user, or null when there is no valid session
export const fetchCurrentUser = async () => {
  try {
    const { user } = await apiRequest('/api/auth/me')
    return user
  } catch {
    return null
  }
}

export const logout = () => apiRequest('/api/auth/logout', { method: 'POST' })

// ---- Password recovery and e-mail confirmation (no login needed)

// Always resolves with the same generic message, whether or not the address has an account
export const requestPasswordReset = async (email) =>
  (await apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email }, withMessage: true })).message

// Resolves with { drivingSchoolId, expiresAt }; rejects with code LINK_INVALID, LINK_EXPIRED
// or LINK_USED when the link cannot be used
export const checkPasswordResetLink = (token) =>
  apiRequest('/api/auth/reset-password/check', { method: 'POST', body: { token } })

// Resolves with { drivingSchoolId, locked, message }
export const resetPassword = ({ token, password, confirmPassword }) =>
  apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: { token, password, confirmPassword },
    withMessage: true,
  })

// Confirms a new e-mail address chosen in Settings. Resolves with { email, message }.
export const verifyEmailChange = (token) =>
  apiRequest('/api/auth/verify-email', { method: 'POST', body: { token }, withMessage: true })
