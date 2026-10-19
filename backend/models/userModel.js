// Database access for the users table. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const USER_COLUMNS =
  'id, driving_school_id, name, email, password_hash, role, status, session_version, locked_at, responsibility, profile_picture, created_at, updated_at'

// Columns for admin listings: never the password hash
const LIST_COLUMNS = 'id, driving_school_id, name, email, role, status, locked_at, responsibility, created_at'

const findOne = async (db, where, value, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${USER_COLUMNS} FROM users WHERE ${where} LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [value],
  )
  return rows[0] ?? null
}

// `forUpdate` locks the row for the surrounding transaction
export const findById = (id, db = pool, options) => findOne(db, 'id = ?', id, options)

export const findByDrivingSchoolId = (drivingSchoolId, db = pool) =>
  findOne(db, 'driving_school_id = ?', drivingSchoolId)

export const findByEmail = (email, db = pool) => findOne(db, 'email = ?', email)

// Returns the new user's id. `responsibility` is for instructors only.
export const create = async (
  { drivingSchoolId, name, email, passwordHash, role, responsibility = null },
  db = pool,
) => {
  const [result] = await db.execute(
    'INSERT INTO users (driving_school_id, name, email, password_hash, role, responsibility) VALUES (?, ?, ?, ?, ?, ?)',
    [drivingSchoolId, name, email, passwordHash, role, responsibility],
  )
  return result.insertId
}

// Changes only the instructor's responsibility; every other field stays as it is
export const updateResponsibility = async (id, responsibility, db = pool) => {
  await db.execute("UPDATE users SET responsibility = ? WHERE id = ? AND role = 'instructor'", [
    responsibility,
    id,
  ])
}

// Builds the WHERE clause shared by the admin list and its count.
// `roles` is required; `status` and `search` are optional.
const buildListFilter = ({ roles, status, search }) => {
  const conditions = [`role IN (${roles.map(() => '?').join(', ')})`]
  const params = [...roles]
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }
  if (search) {
    // The search text is matched literally: LIKE wildcards in it are escaped
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`
    conditions.push('(driving_school_id LIKE ? OR name LIKE ? OR email LIKE ?)')
    params.push(pattern, pattern, pattern)
  }
  return { where: conditions.join(' AND '), params }
}

// One page of users, newest first, plus the total number of matches
export const findPage = async ({ roles, status, search, limit, offset }, db = pool) => {
  const { where, params } = buildListFilter({ roles, status, search })
  // query() rather than execute(): prepared statements reject LIMIT placeholders on some
  // MySQL versions. The values are still escaped by the driver, never concatenated.
  const [rows] = await db.query(
    `SELECT ${LIST_COLUMNS} FROM users WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  )
  const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM users WHERE ${where}`, params)
  return { rows, total }
}

// Ids of the accounts of one role that can currently sign in
export const findActiveIdsByRole = async (role, db = pool) => {
  const [rows] = await db.execute(
    "SELECT id FROM users WHERE role = ? AND status = 'active' ORDER BY id",
    [role],
  )
  return rows.map((row) => row.id)
}

export const updateStatus =async (id, status, db = pool) => {
  await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id])
}

// Locks the account until a reapplication is approved (`lockedAt` is the time), or
// unlocks it (null). Has nothing to do with `status`.
export const setLocked = async (id, lockedAt, db = pool) => {
  await db.execute('UPDATE users SET locked_at = ? WHERE id = ?', [lockedAt, id])
}

// Makes every login token issued so far for this user invalid
export const incrementSessionVersion = async (id, db = pool) => {
  await db.execute('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [id])
}

export const remove = async (id, db = pool) => {
  await db.execute('DELETE FROM users WHERE id = ?', [id])
}

// ---- Settings page and account recovery. Each changes exactly one thing about the
// account: never its Driving School ID, role, status or lock.

export const updateName = async (id, name, db = pool) => {
  await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, id])
}

// Fails with ER_DUP_ENTRY when another account already has the address
export const updateEmail = async (id, email, db = pool) => {
  await db.execute('UPDATE users SET email = ? WHERE id = ?', [email, id])
}

export const updatePasswordHash = async (id, passwordHash, db = pool) => {
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id])
}

// `storedName` is the file's name in the profile picture folder, or null for none
export const updateProfilePicture = async (id, storedName, db = pool) => {
  await db.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [storedName, id])
}
