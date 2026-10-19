// Database access for registration_applications. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

// The list deliberately leaves out NIC, address and e-mail. A reapplication belongs to an
// existing student (`user_id`); `student_driving_school_id` is that student's ID.
const SUMMARY_COLUMNS = `a.id, a.full_name, a.mobile_number, a.package_name, a.status,
  a.driving_school_id, a.application_type, a.user_id, a.created_at,
  ru.driving_school_id AS student_driving_school_id`

const WITH_STUDENT = 'registration_applications a LEFT JOIN users ru ON ru.id = a.user_id'

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

// `type` is NEW_STUDENT or REAPPLICATION
export const findAll = async ({ status, type } = {}, db = pool) => {
  const conditions = []
  const params = []
  if (status) {
    conditions.push('a.status = ?')
    params.push(status)
  }
  if (type) {
    conditions.push('a.application_type = ?')
    params.push(type)
  }
  const [rows] = await db.execute(
    `SELECT ${SUMMARY_COLUMNS} FROM ${WITH_STUDENT}
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC, a.id DESC`,
    params,
  )
  return rows
}

// The full application plus `account_user_id`: the user who registered with its
// Driving School ID (NULL until that happens, or after the account is deleted), and
// `driving_school_id_status` (available / assigned / revoked). For a reapplication,
// `student_driving_school_id` is the ID of the existing student it belongs to.
// `forUpdate` locks the application (and its ID row) for the surrounding transaction.
export const findById = async (id, db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT a.*, d.user_id AS account_user_id, d.status AS driving_school_id_status,
            ru.driving_school_id AS student_driving_school_id
       FROM ${WITH_STUDENT}
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

// `approvalEmailStatus` is PENDING (an e-mail is to be sent) or NO_EMAIL (no address given)
export const markApproved = async (id, drivingSchoolId, approvalEmailStatus, db = pool) => {
  await db.execute(
    `UPDATE registration_applications
        SET status = 'APPROVED', driving_school_id = ?, approved_at = NOW(), approval_email_status = ?
      WHERE id = ?`,
    [drivingSchoolId, approvalEmailStatus, id],
  )
}

// Claims the sending of the approval e-mail of an approved first-time application: true
// for exactly one caller. Possible while it was never sent (NULL: approved before these
// e-mails existed), is PENDING or FAILED, or has been SENDING since before `staleBefore`
// (a send that never finished). Never after SENT.
export const claimApprovalEmail = async (id, now, staleBefore, db = pool) => {
  const [result] = await db.execute(
    `UPDATE registration_applications
        SET approval_email_status = 'SENDING', approval_email_attempted_at = ?
      WHERE id = ? AND status = 'APPROVED' AND application_type = 'NEW_STUDENT'
        AND driving_school_id IS NOT NULL
        AND (approval_email_status IS NULL OR approval_email_status IN ('PENDING', 'FAILED')
             OR (approval_email_status = 'SENDING' AND approval_email_attempted_at < ?))`,
    [now, id, staleBefore],
  )
  return result.affectedRows === 1
}

// The outcome of a claimed send: SENT (with `sentAt`), FAILED (with `error`) or NO_EMAIL
export const recordApprovalEmail = async (id, { status, sentAt = null, error = null }, db = pool) => {
  await db.execute(
    `UPDATE registration_applications
        SET approval_email_status = ?, approval_email_sent_at = ?, approval_email_error = ?
      WHERE id = ?`,
    [status, sentAt, error === null ? null : error.slice(0, 300), id],
  )
}

export const markSuspended = async (id, db = pool) => {
  await db.execute("UPDATE registration_applications SET status = 'SUSPENDED' WHERE id = ?", [id])
}

// Document rows are removed with it (ON DELETE CASCADE)
export const remove = async (id, db = pool) => {
  await db.execute('DELETE FROM registration_applications WHERE id = ?', [id])
}

// ---- Reapplications: the new application of an existing student whose account is locked

// The application a student first registered with (the one their Driving School ID was
// issued for), in full
export const findFirstByDrivingSchoolId = async (drivingSchoolId, db = pool) => {
  const [rows] = await db.execute(
    'SELECT * FROM registration_applications WHERE driving_school_id = ? LIMIT 1',
    [drivingSchoolId],
  )
  return rows[0] ?? null
}

// Returns the new application's id. It belongs to `userId`: no Driving School ID is
// issued for it. Fails with ER_DUP_ENTRY when the student already has a pending
// reapplication (see the UNIQUE key on `pending`).
export const createReapplication = async (application, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO registration_applications
       (full_name, mobile_number, email, nic, address,
        package_id, package_name, package_price, minimum_payment, payment_method,
        application_type, user_id, pending, new_medical_report_confirmed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'REAPPLICATION', ?, 1, ?)`,
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
      application.userId,
      application.newMedicalReportConfirmed ? 1 : 0,
    ],
  )
  return result.insertId
}

// The student's reapplications in full, newest first
export const findReapplicationsByUser = async (userId, db = pool) => {
  const [rows] = await db.execute(
    `SELECT * FROM registration_applications
      WHERE user_id = ? AND application_type = 'REAPPLICATION'
      ORDER BY created_at DESC, id DESC`,
    [userId],
  )
  return rows
}

export const findPendingReapplication = async (userId, db = pool) => {
  const [rows] = await db.execute(
    'SELECT id FROM registration_applications WHERE user_id = ? AND pending = 1 LIMIT 1',
    [userId],
  )
  return rows[0] ?? null
}

// Both changes only apply to a reapplication that is still NEW, so it can never be
// decided twice. They return whether the application was changed.

export const markReapplicationApproved = async (id, { reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE registration_applications
        SET status = 'APPROVED', pending = NULL, approved_at = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'NEW' AND application_type = 'REAPPLICATION'`,
    [reviewedAt, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}

export const markReapplicationRejected = async (id, { reason, reviewedBy, reviewedAt }, db = pool) => {
  const [result] = await db.execute(
    `UPDATE registration_applications
        SET status = 'REJECTED', pending = NULL, rejection_reason = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ? AND status = 'NEW' AND application_type = 'REAPPLICATION'`,
    [reason, reviewedBy, reviewedAt, id],
  )
  return result.affectedRows === 1
}
