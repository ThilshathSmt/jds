// Business rules for requests for a physical driving licence examination date.
//
//   student submits (PENDING) -> admin approves one preferred date (APPROVED)
//                             -> admin rejects with a reason      (REJECTED)
//
// What the server alone decides, whatever a browser sends:
//   - who the student is (the signed-in account: id, name and Driving School ID)
//   - which dates are acceptable (future Tuesdays in Sri Lanka, see validationUtils.js)
//   - that the approved date is one of the dates the student asked for
//   - that a request is decided once: a decided request never changes again
// The preferred dates are preferences, not bookings: approving a request confirms exactly
// one of them and nothing is recorded for the others.
//
// Every function takes `now` last. Callers leave it out; tests pass a fixed time.

import { withTransaction } from '../config/database.js'
import * as examDateRequestModel from '../models/examDateRequestModel.js'
import AppError from '../utils/AppError.js'
import { formatLongDate, getSchoolDate } from '../utils/dateUtils.js'
import { REJECTION_REASONS } from '../utils/validationUtils.js'
import {
  NOTIFICATION_TYPES,
  markRequestNotificationsRead,
  notify,
  notifyRole,
} from './notificationService.js'

const NOT_FOUND = 'Exam date request not found.'
const ALREADY_PENDING =
  'You already have an exam date request awaiting admin review. You can submit a new request once it has been reviewed.'

const DECIDED_MESSAGES = {
  APPROVED: 'This request has already been approved.',
  REJECTED: 'This request has already been rejected and cannot be changed.',
}

const toRequest = (row) => ({
  id: row.id,
  studentName: row.student_name,
  drivingSchoolId: row.driving_school_id,
  medicalReportSubmitted: row.medical_report_submitted === 1,
  preferredDates: row.preferred_dates,
  status: row.status,
  approvedDate: row.approved_date,
  rejectionReasonCode: row.rejection_reason_code,
  rejectionReason: row.rejection_reason,
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

// ---- Student. `student` is req.user: the signed-in account, never anything from the request.

// The student's own requests, newest first, and whether a new one may be submitted now
export const listOwn = async (student) => {
  const requests = (await examDateRequestModel.findByUser(student.id)).map(toRequest)
  return { requests, canSubmit: !requests.some((request) => request.status === 'PENDING') }
}

export const getOwn = async (id, student) => {
  const request = await examDateRequestModel.findOwned(id, student.id)
  if (!request) throw new AppError(404, NOT_FOUND)
  return toRequest(request)
}

// Saves the request and tells the admins, in one transaction. `input` has already been
// validated: the medical report is confirmed and the dates are 1-3 future Tuesdays.
export const submit = async (student, { preferredDates }) => {
  try {
    const requestId = await withTransaction(async (db) => {
      if (await examDateRequestModel.findPendingByUser(student.id, db)) {
        throw new AppError(409, ALREADY_PENDING)
      }
      const newId = await examDateRequestModel.create(
        {
          userId: student.id,
          studentName: student.name,
          drivingSchoolId: student.drivingSchoolId,
          medicalReportSubmitted: true,
          preferredDates,
        },
        db,
      )
      await notifyRole(
        'admin',
        {
          type: NOTIFICATION_TYPES.examDateRequestSubmitted,
          title: 'New exam date request',
          message: `New physical driving licence exam date request from ${student.name}.`,
          examDateRequestId: newId,
        },
        db,
      )
      return newId
    })
    return toRequest(await examDateRequestModel.findById(requestId))
  } catch (error) {
    // Two submissions at the same moment: the UNIQUE key let only one through
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, ALREADY_PENDING)
    throw error
  }
}

// ---- Admin

export const list = async ({ status }) =>
  (await examDateRequestModel.findAll({ status })).map(toRequest)

export const getDetails = async (id) => {
  const request = await examDateRequestModel.findById(id)
  if (!request) throw new AppError(404, NOT_FOUND)
  return toRequest(request)
}

// Locks the request, checks it can still be decided, runs `applyDecision(request, db)` and marks
// the admins' notifications about it as read: nobody has to act on it any more.
// Locking the row makes a second, simultaneous decision wait and then see the first one.
const decide = async (id, now, applyDecision) => {
  await withTransaction(async (db) => {
    const request = await examDateRequestModel.findById(id, db, { forUpdate: true })
    if (!request) throw new AppError(404, NOT_FOUND)
    if (request.status !== 'PENDING') throw new AppError(409, DECIDED_MESSAGES[request.status])

    await applyDecision(request, db)
    await markRequestNotificationsRead(id, NOTIFICATION_TYPES.examDateRequestSubmitted, now, db)
  })
  return getDetails(id)
}

// Confirms exactly one of the student's preferred dates and tells the student
export const approve = async (id, adminId, { approvedDate }, now = new Date()) =>
  decide(id, now, async (request, db) => {
    if (!request.preferred_dates.includes(approvedDate)) {
      const message = 'Choose one of the dates the student requested.'
      throw new AppError(400, message, { approvedDate: message })
    }
    if (approvedDate < getSchoolDate(now)) {
      const message = 'This date has already passed. Choose another of the requested dates.'
      throw new AppError(409, message, { approvedDate: message })
    }

    const changed = await examDateRequestModel.markApproved(
      id,
      { approvedDate, reviewedBy: adminId, reviewedAt: now },
      db,
    )
    if (!changed) throw new AppError(409, DECIDED_MESSAGES.APPROVED)
    await notify(
      request.user_id,
      {
        type: NOTIFICATION_TYPES.examDateRequestApproved,
        title: 'Exam date approved',
        message: `Your physical driving licence examination date has been approved for ${formatLongDate(approvedDate)}. Best of luck! Please prepare well for your examination.`,
        examDateRequestId: id,
      },
      db,
    )
  })

// `reasonCode` is one of REJECTION_REASONS; `otherReason` is the admin's own text for OTHER
export const reject = async (id, adminId, { reasonCode, otherReason }, now = new Date()) =>
  decide(id, now, async (request, db) => {
    const reason = reasonCode === 'OTHER' ? otherReason : REJECTION_REASONS[reasonCode]
    const changed = await examDateRequestModel.markRejected(
      id,
      { reasonCode, reason, reviewedBy: adminId, reviewedAt: now },
      db,
    )
    if (!changed) throw new AppError(409, DECIDED_MESSAGES.REJECTED)
    await notify(
      request.user_id,
      {
        type: NOTIFICATION_TYPES.examDateRequestRejected,
        title: 'Exam date request rejected',
        // The reason ends the sentence itself when the admin wrote it with a full stop
        message: `Your physical driving licence examination date request has been rejected. Reason: ${reason.replace(/[.\s]+$/, '')}. Please review the reason before submitting another request.`,
        examDateRequestId: id,
      },
      db,
    )
  })
