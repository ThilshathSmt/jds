import { Router } from 'express'
import * as galleryController from '../controllers/galleryController.js'

const router = Router()

// Public: the landing page's Gallery. Uploading and deleting are in adminRoutes.js.
router.get('/', galleryController.listPublic)
router.get('/:id/image', galleryController.getImage)

export default router
