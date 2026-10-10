import { Router } from 'express'
import * as userManagementController from '../controllers/userManagementController.js'

// Mounted at /api/admin/users by adminRoutes.js, behind its admin-only guard
const router = Router()

router.get('/', userManagementController.list)
// Before '/:id' so "next-instructor-id" is not read as a user id
router.get('/next-instructor-id', userManagementController.getNextInstructorId)
router.post('/instructors', userManagementController.createInstructor)
router.get('/:id', userManagementController.getDetails)
router.post('/:id/activate', userManagementController.activate)
router.post('/:id/deactivate', userManagementController.deactivate)
router.delete('/:id', userManagementController.remove)

export default router
