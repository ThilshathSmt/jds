import { Router } from 'express'
import { studentDashboard } from '../controllers/dashboardController.js'
import * as examAttemptController from '../controllers/examAttemptController.js'
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

// Timed attempts. An attempt is always looked up together with the signed-in student.
router.get('/exams/:examType/papers/:paperId/attempt', examAttemptController.getPaperState)
router.post('/exams/:examType/papers/:paperId/attempts', examAttemptController.start)
router.get('/exam-attempts/:attemptId', examAttemptController.getAttempt)
router.put('/exam-attempts/:attemptId/answers/:questionId', examAttemptController.saveAnswer)
router.post('/exam-attempts/:attemptId/submit', examAttemptController.submit)
router.post('/exam-attempts/:attemptId/resume', examAttemptController.resume)
router.post('/exam-attempts/:attemptId/finish-review', examAttemptController.finishReview)
router.get('/exam-attempts/:attemptId/result', examAttemptController.getResult)

export default router
