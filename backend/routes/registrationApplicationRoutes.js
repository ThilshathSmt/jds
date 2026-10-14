import { Router } from 'express'
import * as applicationController from '../controllers/registrationApplicationController.js'
import * as settingsController from '../controllers/settingsController.js'
import { uploadReceipt } from '../middleware/uploadMiddleware.js'

const router = Router()

// Public: anyone may submit the Apply Now form. Reviewing applications is admin-only
// (see adminRoutes.js).
router.post('/', uploadReceipt, applicationController.submit)
// Public, read-only: the active packages and the advance payment rule the forms show. The
// reapplication form uses it too. Changing them is admin-only (see adminRoutes.js).
router.get('/options', settingsController.getRegistrationOptions)

export default router
