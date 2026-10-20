import { Router } from 'express'
import { instructorDashboard } from '../controllers/dashboardController.js'
import * as practicalController from '../controllers/practicalController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const router = Router()

router.use(requireAuth, requireRole('instructor'))

router.get('/dashboard', instructorDashboard)

// Lessons assigned to the signed-in instructor, and their attendance
router.get('/lessons', practicalController.listInstructorLessons)
router.get('/eligible-students', practicalController.listEligibleInstructorStudents)
router.put('/lessons/:id/attendance', practicalController.markAttendance)

// Feedback on the students the signed-in instructor teaches (their own feedback only)
router.get('/students', practicalController.getInstructorStudents)
router.get('/feedbacks', practicalController.listOwnFeedbacks)
router.post('/feedbacks', practicalController.createFeedback)
router.put('/feedbacks/:id', practicalController.updateFeedback)

export default router
