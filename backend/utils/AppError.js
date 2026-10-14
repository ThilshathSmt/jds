// An error that is safe to show to the API client, with the HTTP status to send.
// `errors` optionally maps request fields to messages (validation failures).
// `code` optionally names the situation for the frontend, when it has to react to it
// (for example REAPPLICATION_REQUIRED for a locked account).
class AppError extends Error {
  constructor(statusCode, message, errors, code) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.errors = errors
    this.code = code
  }
}

export default AppError
