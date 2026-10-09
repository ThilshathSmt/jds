import { Router } from 'express'
import { studentDashboard } from '../controllers/dashboardController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = Router()

router.use(requireAuth, requireRole('student'))

router.get('/dashboard', studentDashboard)

export default router
