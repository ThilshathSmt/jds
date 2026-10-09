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

// No role is sent: the backend takes it from the provisioned Driving School ID
export const register = async ({ schoolId, name, email, password, confirmPassword }) => {
  const { user } = await withFormFieldErrors(
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: { drivingSchoolId: schoolId, name, email, password, confirmPassword },
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
