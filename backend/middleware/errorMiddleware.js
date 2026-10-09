import AppError from '../utils/AppError.js'

export const notFound = (req, res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`))
}

// Central error handler: every error response is { success: false, message }
// (plus `errors` with per-field messages for validation failures). Express recognises an
// error handler by its four parameters, so `next` must stay in the signature.
export const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    })
  }
  // Upload rejected by multer (see uploadMiddleware.js)
  if (error.name === 'MulterError') {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Maximum file size is 2 MB.'
        : 'The upload could not be processed.'
    return res.status(400).json({ success: false, message, errors: { receipt: message } })
  }
  // Malformed or oversized JSON body
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON.' })
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' })
  }
  // A unique key was violated by two requests racing each other
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This record already exists.' })
  }

  // Unexpected: log the details, never send them to the client
  console.error(error)
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' })
}
