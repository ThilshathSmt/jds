import { Router } from 'express'
import * as profileController from '../controllers/profileController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { rateLimit } from '../middleware/rateLimitMiddleware.js'
import { uploadProfilePicture } from '../middleware/uploadMiddleware.js'

const router = Router()

// Settings: every signed-in account (student, instructor or admin), its own profile only
router.use(requireAuth)

// These check the current password (and an e-mail change sends an e-mail), so guessing is
// slowed down
const passwordChecks = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

router.get('/', profileController.getProfile)
router.put('/', passwordChecks, profileController.updateProfile)
router.delete('/email-change', profileController.cancelEmailChange)
router.put('/password', passwordChecks, profileController.changePassword)
router.get('/picture', profileController.getPicture)
router.post('/picture', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), uploadProfilePicture, profileController.uploadPicture)
router.delete('/picture', profileController.removePicture)

export default router
