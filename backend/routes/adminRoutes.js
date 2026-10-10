import { Router } from 'express'
import { adminDashboard } from '../controllers/dashboardController.js'
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
router.delete('/registration-forms/:id', applicationController.remove)
router.get('/registration-forms/:id/documents/:documentId', applicationController.getDocument)

export default router
