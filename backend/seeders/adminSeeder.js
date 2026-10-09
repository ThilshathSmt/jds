// Creates the first Admin account from the ADMIN_* environment variables.
// This is the only way an admin is created: public registration can never produce one.
// Usage: npm run seed:admin   (safe to run again: it never creates a duplicate)

import env, { requireDatabaseEnv, requireEnv } from '../config/env.js'
import { hashPassword } from '../utils/passwordUtils.js'
import { getPasswordError, isValidEmail } from '../utils/validationUtils.js'

const PLACEHOLDER_PASSWORD = 'change_this_password'

const seedAdmin = async () => {
  requireDatabaseEnv()
  const { drivingSchoolId, name, password } = env.admin
  const email = env.admin.email?.trim().toLowerCase()
  requireEnv({ ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password })

  if (!isValidEmail(email)) throw new Error('ADMIN_EMAIL is not a valid email address.')
  if (password === PLACEHOLDER_PASSWORD) {
    throw new Error('ADMIN_PASSWORD still has the example value. Set a real password in .env.')
  }
  const passwordError = getPasswordError(password)
  if (passwordError) throw new Error(`ADMIN_PASSWORD: ${passwordError}`)

  // Imported after the checks so configuration problems are reported before connecting
  const { default: pool, withTransaction } = await import('../config/database.js')
  const userModel = await import('../models/userModel.js')
  const drivingSchoolIdModel = await import('../models/drivingSchoolIdModel.js')

  try {
    if (await userModel.findByDrivingSchoolId(drivingSchoolId)) {
      console.log(`Admin "${drivingSchoolId}" already exists. Nothing was changed.`)
      return
    }
    if (await userModel.findByEmail(email)) {
      throw new Error(`Another account already uses ${email}. Choose a different ADMIN_EMAIL.`)
    }

    // Only the bcrypt hash is stored, never the password itself
    const passwordHash = await hashPassword(password)
    await withTransaction(async (db) => {
      const userId = await userModel.create(
        { drivingSchoolId, name: name.trim(), email, passwordHash, role: 'admin' },
        db,
      )
      // Reserve the ID in the registry so nobody can ever register with it
      const reserved = await drivingSchoolIdModel.findByDrivingSchoolId(drivingSchoolId, db, {
        forUpdate: true,
      })
      if (reserved) await drivingSchoolIdModel.markAssigned(reserved.id, userId, db)
      else {
        await drivingSchoolIdModel.create(
          { drivingSchoolId, role: 'admin', status: 'assigned', userId },
          db,
        )
      }
    })
    console.log(`Admin "${drivingSchoolId}" created (${email}). Log in with this ID on the Login page.`)
  } finally {
    await pool.end()
  }
}

seedAdmin().catch((error) => {
  console.error(`Admin seeding failed: ${error.message}`)
  process.exit(1)
})
