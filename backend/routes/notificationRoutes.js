import { Router } from 'express'
import * as notificationController from '../controllers/notificationController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

// Any signed-in user, whatever their role: each one only ever reaches their own notifications
router.use(requireAuth)

router.get('/', notificationController.list)
// Before '/:id/read' so "read-all" is not read as a notification id
router.post('/read-all', notificationController.markAllRead)
router.post('/:id/read', notificationController.markRead)

export default router
