// Database access for registration_applications. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

// The list deliberately leaves out NIC, address and e-mail
const SUMMARY_COLUMNS =
  'id, full_name, mobile_number, package_name, status, driving_school_id, created_at'

// Returns the new application's id
export const create = async (application, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO registration_applications
       (full_name, mobile_number, email, nic, address,
        package_id, package_name, package_price, minimum_payment, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      application.fullName,
      application.mobileNumber,
      application.email,
      application.nic,
      application.address,
      application.packageId,
      application.packageName,
      application.packagePrice,
      application.minimumPayment,
      application.paymentMethod,
    ],
  )
  return result.insertId
}

export const findAll = async ({ status } = {}, db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${SUMMARY_COLUMNS} FROM registration_applications
      ${status ? 'WHERE status = ?' : ''}
      ORDER BY created_at DESC, id DESC`,
    status ? [status] : [],
  )
  return rows
}

// The full application plus `account_user_id`: the user who registered with its
// Driving School ID (NULL until that happens, or after the account is deleted), and
// `driving_school_id_status` (available / assigned / revoked).
// `forUpdate` locks the application (and its ID row) for the surrounding transaction.
export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT a.*, d.user_id AS account_user_id, d.status AS driving_school_id_status
       FROM registration_applications a
       LEFT JOIN driving_school_ids d ON d.driving_school_id = a.driving_school_id
      WHERE a.id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  )
  return rows[0] ?? null
}

export const findByDrivingSchoolId = async (drivingSchoolId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT id, status, package_name, mobile_number, approved_at
       FROM registration_applications WHERE driving_school_id = ? LIMIT 1`,
    [drivingSchoolId],
  )
  return rows[0] ?? null
}

export const markApproved = async (id, drivingSchoolId, db = pool) => {
  await db.execute(
    "UPDATE registration_applications SET status = 'APPROVED', driving_school_id = ?, approved_at = NOW() WHERE id = ?",
    [drivingSchoolId, id],
  )
}

export const markSuspended = async (id, db = pool) => {
  await db.execute("UPDATE registration_applications SET status = 'SUSPENDED' WHERE id = ?", [id])
}

// Document rows are removed with it (ON DELETE CASCADE)
export const remove = async (id, db = pool) => {
  await db.execute('DELETE FROM registration_applications WHERE id = ?', [id])
}
