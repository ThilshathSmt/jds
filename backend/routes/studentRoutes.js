import { Router } from 'express'
import { studentDashboard } from '../controllers/dashboardController.js'
import * as examAttemptController from '../controllers/examAttemptController.js'
import * as examController from '../controllers/examController.js'
import * as examDateRequestController from '../controllers/examDateRequestController.js'
import * as examReattemptRequestController from '../controllers/examReattemptRequestController.js'
import * as practicalController from '../controllers/practicalController.js'
import * as reapplicationController from '../controllers/reapplicationController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import { uploadPracticalReceipt, uploadReattemptDocuments } from '../middleware/uploadMiddleware.js'

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

// Requests for a physical driving licence exam date. Always the signed-in student's own.
router.get('/exam-date-requests', examDateRequestController.listOwn)
router.post('/exam-date-requests', examDateRequestController.submit)
router.get('/exam-date-requests/:id', examDateRequestController.getOwn)

// The physical examination attempts of the signed-in student: where they stand, the
// history, and the reattempt payments they submit after a failed attempt
router.get('/licence-exam', examReattemptRequestController.getOverview)
router.post(
  '/licence-exam/reattempt-requests',
  uploadReattemptDocuments,
  examReattemptRequestController.submit,
)
router.get('/licence-exam/reattempt-requests/:id', examReattemptRequestController.getOwn)
router.get(
  '/licence-exam/reattempt-requests/:id/documents/:documentId',
  examReattemptRequestController.getOwnDocument,
)

// Practical training and the practical test of the signed-in student only
router.get('/practical', practicalController.getStudentOverview)
router.get('/practical/cycles/:id', practicalController.getStudentCycle)
router.post('/practical/payments', uploadPracticalReceipt, practicalController.submitPayment)
router.get('/practical/payments/:paymentId/receipt', practicalController.getOwnPaymentReceipt)

// A reapplication the student made while locked out, for the notification about it
router.get('/reapplications/:id', reapplicationController.getOwn)

export default router
