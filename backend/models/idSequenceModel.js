// Database access for driving_school_id_sequences (one counter per ID prefix).

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
