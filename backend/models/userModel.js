// Database access for the users table. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const USER_COLUMNS =
  'id, driving_school_id, name, email, password_hash, role, status, created_at, updated_at'

const findOne = async (db, where, value) => {
  const [rows] = await db.execute(`SELECT ${USER_COLUMNS} FROM users WHERE ${where} LIMIT 1`, [
    value,
  ])
  return rows[0] ?? null
}

export const findById = (id, db = pool) => findOne(db, 'id = ?', id)

export const findByDrivingSchoolId = (drivingSchoolId, db = pool) =>
  findOne(db, 'driving_school_id = ?', drivingSchoolId)

export const findByEmail = (email, db = pool) => findOne(db, 'email = ?', email)

// Returns the new user's id
export const create = async ({ drivingSchoolId, name, email, passwordHash, role }, db = pool) => {
  const [result] = await db.execute(
    'INSERT INTO users (driving_school_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [drivingSchoolId, name, email, passwordHash, role],
  )
  return result.insertId
}
