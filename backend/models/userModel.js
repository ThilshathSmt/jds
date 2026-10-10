// Database access for the users table. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const USER_COLUMNS =
  'id, driving_school_id, name, email, password_hash, role, status, session_version, created_at, updated_at'

// Columns for admin listings: never the password hash
const LIST_COLUMNS = 'id, driving_school_id, name, email, role, status, created_at'

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

// Returns the new user's id
export const create = async ({ drivingSchoolId, name, email, passwordHash, role }, db = pool) => {
  const [result] = await db.execute(
    'INSERT INTO users (driving_school_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [drivingSchoolId, name, email, passwordHash, role],
  )
  return result.insertId
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

export const updateStatus = async (id, status, db = pool) => {
  await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id])
}

// Makes every login token issued so far for this user invalid
export const incrementSessionVersion = async (id, db = pool) => {
  await db.execute('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [id])
}

export const remove = async (id, db = pool) => {
  await db.execute('DELETE FROM users WHERE id = ?', [id])
}
