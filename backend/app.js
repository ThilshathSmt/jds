import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import env from './config/env.js'
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import instructorRoutes from './routes/instructorRoutes.js'
import registrationApplicationRoutes from './routes/registrationApplicationRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import { sendSuccess } from './utils/responseUtils.js'

const app = express()

app.disable('x-powered-by')
// Only the frontend origin may call the API with the session cookie
app.use(cors({ origin: env.clientUrl, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => sendSuccess(res, { message: 'API is running' }))

app.use('/api/auth', authRoutes)
app.use('/api/registration-applications', registrationApplicationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/instructor', instructorRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
