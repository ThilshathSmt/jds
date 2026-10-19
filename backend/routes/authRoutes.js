import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { rateLimit } from '../middleware/rateLimitMiddleware.js'

const router = Router()

router.post('/register', authController.register)
// Shows a name and e-mail for an ID, so guessing IDs is slowed down
router.post('/register/verify', rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }), authController.verifyRegistrationId)
router.post('/login', authController.login)
router.get('/me', requireAuth, authController.me)
router.post('/logout', authController.logout)

// Password recovery and e-mail confirmation (no login). Limited per client so that neither
// inboxes can be flooded nor links guessed.
const FIFTEEN_MINUTES = 15 * 60 * 1000
router.post('/forgot-password', rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5 }), authController.forgotPassword)
const linkChecks = rateLimit({ windowMs: FIFTEEN_MINUTES, max: 30 })
router.post('/reset-password/check', linkChecks, authController.checkResetLink)
router.post('/reset-password', linkChecks, authController.resetPassword)
router.post('/verify-email', linkChecks, authController.verifyEmail)

export default router
