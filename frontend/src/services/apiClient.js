// Small fetch wrapper for the Jeslan backend API.
// The login session lives in an httpOnly cookie, so every request sends credentials.

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// `fieldErrors` maps request fields to messages when the backend rejects specific inputs.
// `code` names the situation when the backend says which one it is (see ACCOUNT_LOCKED).
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
  }
}

// The backend's code for an account that is locked after three failed examination
// attempts: it must submit a new registration application before it can be used again
export const ACCOUNT_LOCKED = 'REAPPLICATION_REQUIRED'

// Called when a signed-in request is refused because the account has been locked in the
// meantime (see AuthProvider). The login form and the session check on page load handle
// the refusal themselves.
let accountLockedHandler = null
export const onAccountLocked = (handler) => {
  accountLockedHandler = handler
}
const HANDLES_LOCK_ITSELF = ['/api/auth/', '/api/reapplications']

// Resolves with the response's `data`; rejects with an ApiError carrying the backend message.
// `body` is sent as JSON, or as multipart/form-data when it is a FormData (file uploads).
export const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const isFormData = body instanceof FormData
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      // For FormData the browser sets the multipart Content-Type (with its boundary) itself
      headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
      body: body && !isFormData ? JSON.stringify(body) : body,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Please try again in a moment.', 0)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    if (payload?.code === ACCOUNT_LOCKED && !HANDLES_LOCK_ITSELF.some((prefix) => path.startsWith(prefix))) {
      accountLockedHandler?.()
    }
    throw new ApiError(
      payload?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.errors,
      payload?.code,
    )
  }
  return payload.data
}
