import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Load backend/.env regardless of the directory the process was started from
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true })

const PLACEHOLDER_SECRET = 'change_this_secret'

const env = {
  backendRoot,
  // Uploaded application documents. Outside any folder served to the public.
  applicationUploadsDir: path.resolve(
    backendRoot,
    process.env.UPLOAD_DIR || 'uploads',
    'applications',
  ),
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  authSecret: process.env.AUTH_SECRET,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  admin: {
    drivingSchoolId: process.env.ADMIN_DRIVING_SCHOOL_ID || 'JDS_admin',
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
}

// Throws with a clear message listing every missing setting
export const requireEnv = (settings) => {
  const missing = Object.entries(settings)
    .filter(([, value]) => value === undefined || value === '')
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    )
  }
}

export const requireDatabaseEnv = () =>
  requireEnv({ DB_USER: env.db.user, DB_NAME: env.db.name })

export const requireAuthEnv = () => {
  requireEnv({ AUTH_SECRET: env.authSecret })
  if (env.isProduction && env.authSecret === PLACEHOLDER_SECRET) {
    throw new Error('AUTH_SECRET still has the example value. Set a long random secret.')
  }
}

export default env
