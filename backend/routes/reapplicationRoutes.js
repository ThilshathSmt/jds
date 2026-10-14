import { Router } from 'express'
import * as reapplicationController from '../controllers/reapplicationController.js'
import { uploadReapplicationDocuments } from '../middleware/uploadMiddleware.js'

const router = Router()

// Public, because a locked student cannot log in. Every request carries the student's
// Driving School ID and password, which the service checks before anything else: knowing
// an ID alone reveals nothing. Reviewing reapplications is admin-only (see adminRoutes.js).
router.post('/status', reapplicationController.getStatus)
router.post('/', uploadReapplicationDocuments, reapplicationController.submit)

export default router
