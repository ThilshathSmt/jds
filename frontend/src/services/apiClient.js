// Small fetch wrapper for the Jeslan backend API.
// The login session lives in an httpOnly cookie, so every request sends credentials.

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// `fieldErrors` maps request fields to messages when the backend rejects specific inputs
export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

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
    throw new ApiError(
      payload?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.errors,
    )
  }
  return payload.data
}
