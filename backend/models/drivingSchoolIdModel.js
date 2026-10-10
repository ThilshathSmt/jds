// Database access for the driving_school_ids table (IDs issued by the school).
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const ID_COLUMNS = 'id, driving_school_id, role, status, user_id, created_by, created_at, updated_at'

// `forUpdate` locks the row for the surrounding transaction so an ID cannot be used twice
export const findByDrivingSchoolId = async (drivingSchoolId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${ID_COLUMNS} FROM driving_school_ids WHERE driving_school_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [drivingSchoolId],
  )
  return rows[0] ?? null
}

export const findByUserId = async (userId, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${ID_COLUMNS} FROM driving_school_ids WHERE user_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId],
  )
  return rows[0] ?? null
}

export const findAll = async (db = pool) => {
  const [rows] = await db.execute(`SELECT ${ID_COLUMNS} FROM driving_school_ids ORDER BY id`)
  return rows
}

// Returns the new row's id
export const create = async (
  { drivingSchoolId, role, status = 'available', userId = null, createdBy = null },
  db = pool,
) => {
  const [result] = await db.execute(
    'INSERT INTO driving_school_ids (driving_school_id, role, status, user_id, created_by) VALUES (?, ?, ?, ?, ?)',
    [drivingSchoolId, role, status, userId, createdBy],
  )
  return result.insertId
}

export const markAssigned = async (id, userId, db = pool) => {
  await db.execute("UPDATE driving_school_ids SET status = 'assigned', user_id = ? WHERE id = ?", [
    userId,
    id,
  ])
}

// Withdraws an ID that has not been used yet; an assigned ID is left untouched
export const revokeIfAvailable = async (drivingSchoolId, db = pool) => {
  await db.execute(
    "UPDATE driving_school_ids SET status = 'revoked' WHERE driving_school_id = ? AND status = 'available'",
    [drivingSchoolId],
  )
}

// Withdraws the ID of an account that is being deleted. The row is kept (applications may
// still refer to it, and keeping it stops the ID from ever being issued or used again).
export const revokeAndUnlink = async (id, db = pool) => {
  await db.execute("UPDATE driving_school_ids SET status = 'revoked', user_id = NULL WHERE id = ?", [
    id,
  ])
}
