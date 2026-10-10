// Database access for driving_school_id_sequences (one counter per ID prefix).

import pool from '../config/database.js'

// Returns the next number for `prefix`. Must be called with a transaction connection:
// the statement locks the counter row until that transaction commits or rolls back, so
// concurrent callers queue up and each receives a different number. A rollback also
// restores the counter.
export const nextNumber = async (prefix, db) => {
  const [result] = await db.execute(
    `INSERT INTO driving_school_id_sequences (prefix, last_number) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [prefix],
  )
  // affectedRows is 1 when the counter row was just created, otherwise the updated
  // value is reported back through LAST_INSERT_ID()
  return result.affectedRows === 1 ? 1 : result.insertId
}

// The number the next call to nextNumber would give, without reserving it.
// For display only: another request may take that number first.
export const peekNextNumber = async (prefix, db = pool) => {
  const [rows] = await db.execute(
    'SELECT last_number FROM driving_school_id_sequences WHERE prefix = ? LIMIT 1',
    [prefix],
  )
  return (rows[0]?.last_number ?? 0) + 1
}
