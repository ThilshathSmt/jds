// Every successful response has the same shape: { success, message, data }
export const sendSuccess = (res, { statusCode = 200, message, data = {} }) =>
  res.status(statusCode).json({ success: true, message, data })
