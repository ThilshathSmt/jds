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

export default router
