import { Router } from 'express'
import { studentDashboard } from '../controllers/dashboardController.js'
import * as examController from '../controllers/examController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = Router()

// Everything under /api/student is student-only
router.use(requireAuth, requireRole('student'))

router.get('/dashboard', studentDashboard)

router.get('/exams', examController.list)
router.get('/exams/:examType', examController.getDetails)
router.get('/exams/:examType/papers', examController.listPapers)
router.get('/exams/:examType/papers/:paperId/questions', examController.getPaperQuestions)

export default router
