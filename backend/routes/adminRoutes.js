import { Router } from 'express'
import { adminDashboard } from '../controllers/dashboardController.js'
import * as examDateRequestController from '../controllers/examDateRequestController.js'
import * as examReattemptRequestController from '../controllers/examReattemptRequestController.js'
import * as provisioningController from '../controllers/provisioningController.js'
import * as applicationController from '../controllers/registrationApplicationController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import userManagementRoutes from './userManagementRoutes.js'

const router = Router()

// Everything under /api/admin is admin-only
router.use(requireAuth, requireRole('admin'))

router.get('/dashboard', adminDashboard)

router.use('/users', userManagementRoutes)

router.get('/driving-school-ids', provisioningController.listDrivingSchoolIds)
router.post('/driving-school-ids', provisioningController.createDrivingSchoolId)

router.get('/registration-forms', applicationController.list)
router.get('/registration-forms/:id', applicationController.getDetails)
router.post('/registration-forms/:id/approve', applicationController.approve)
router.post('/registration-forms/:id/suspend', applicationController.suspend)
router.post('/registration-forms/:id/reject', applicationController.reject)
router.delete('/registration-forms/:id', applicationController.remove)
router.get('/registration-forms/:id/documents/:documentId', applicationController.getDocument)

// Requests for a physical driving licence exam date, reviewed on the Notifications page
router.get('/exam-date-requests', examDateRequestController.list)
router.get('/exam-date-requests/:id', examDateRequestController.getDetails)
router.post('/exam-date-requests/:id/approve', examDateRequestController.approve)
router.post('/exam-date-requests/:id/reject', examDateRequestController.reject)
router.post('/exam-date-requests/:id/result', examDateRequestController.recordResult)

// Reattempt payments: the fee owed after each failed attempt and, after a third failure,
// the new medical report
router.get('/exam-reattempt-requests', examReattemptRequestController.list)
router.get('/exam-reattempt-requests/:id', examReattemptRequestController.getDetails)
router.post('/exam-reattempt-requests/:id/approve', examReattemptRequestController.approve)
router.post('/exam-reattempt-requests/:id/reject', examReattemptRequestController.reject)
router.get(
  '/exam-reattempt-requests/:id/documents/:documentId',
  examReattemptRequestController.getDocument,
)

export default router
