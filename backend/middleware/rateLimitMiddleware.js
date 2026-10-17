import AppError from '../utils/AppError.js'

// A small in-memory limiter: at most `max` requests per client IP in each `windowMs`.
// Enough for a single server process; it resets when the server restarts.
export const rateLimit = ({ windowMs, max }) => {
  const hits = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const entry = hits.get(key)
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 })
    } else if (entry.count >= max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)))
      return next(new AppError(429, 'Too many attempts. Please wait a few minutes and try again.'))
    } else {
      entry.count += 1
    }
    // Forget old entries now and then so the map does not grow without limit
    if (hits.size > 10000) {
      for (const [ip, value] of hits) if (now - value.start >= windowMs) hits.delete(ip)
    }
    return next()
  }
}
