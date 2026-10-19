// Database access for account_tokens (password reset and e-mail change links). No business
// logic here. Every function takes an optional `db` (pool or transaction connection).
// Only token hashes are ever stored or looked up.

import pool from '../config/database.js'

const TOKEN_COLUMNS = 'id, user_id, purpose, new_email, expires_at, used_at, created_at'

// Returns the new row's id
export const create = async ({ userId, purpose, tokenHash, newEmail = null, expiresAt, createdAt }, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO account_tokens (user_id, purpose, token_hash, new_email, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, purpose, tokenHash, newEmail, expiresAt, createdAt],
  )
  return result.insertId
}

// `forUpdate` locks the row, so a link cannot be used twice at the same moment
export const findByHash = async (tokenHash, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT ${TOKEN_COLUMNS} FROM account_tokens WHERE token_hash = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [tokenHash],
  )
  return rows[0] ?? null
}

// The newest link of `purpose` for the user that has not been used or replaced (it may
// have expired)
export const findLatestOpen = async (userId, purpose, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${TOKEN_COLUMNS} FROM account_tokens
      WHERE user_id = ? AND purpose = ? AND used_at IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 1`,
    [userId, purpose],
  )
  return rows[0] ?? null
}

// Every open link of `purpose` for the user stops working (used or replaced at `now`)
export const closeAllForUser = async (userId, purpose, now, db = pool) => {
  await db.execute(
    'UPDATE account_tokens SET used_at = ? WHERE user_id = ? AND purpose = ? AND used_at IS NULL',
    [now, userId, purpose],
  )
}
