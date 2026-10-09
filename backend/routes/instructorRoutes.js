import { Router } from 'express'
import { instructorDashboard } from '../controllers/dashboardController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = Router()

router.use(requireAuth, requireRole('instructor'))

router.get('/dashboard', instructorDashboard)

export default router
