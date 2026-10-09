// An error that is safe to show to the API client, with the HTTP status to send.
// `errors` optionally maps request fields to messages (validation failures).
class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.errors = errors
  }
}

export default AppError
