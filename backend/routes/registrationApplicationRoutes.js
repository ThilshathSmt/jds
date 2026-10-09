import { Router } from 'express'
import * as applicationController from '../controllers/registrationApplicationController.js'
import { uploadReceipt } from '../middleware/uploadMiddleware.js'

const router = Router()

// Public: anyone may submit the Apply Now form. Reviewing applications is admin-only
// (see adminRoutes.js).
router.post('/', uploadReceipt, applicationController.submit)

export default router
