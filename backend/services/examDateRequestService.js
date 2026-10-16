// Business rules for requests for a physical driving licence examination date.
//
//   student submits (PENDING) -> admin approves one preferred date (APPROVED)
//                             -> admin rejects with a reason      (REJECTED)
//   after the examination, the admin records Passed or Failed for an APPROVED request.
//   That is the moment an attempt is used (see licenceExamService.js for the attempt rules).
//
// What the server alone decides, whatever a browser sends:
//   - who the student is (the signed-in account: id, name and Driving School ID)
//   - which dates are acceptable (future Tuesdays in Sri Lanka, see validationUtils.js)
//   - that the approved date is one of the dates the student asked for
//   - that a request is decided once: a decided request never changes again
//   - whether the student may request a date at all (attempts left, not already passed)
//   - that a booking receives one result, and so uses one attempt, at most
// The preferred dates are preferences, not bookings: approving a request confirms exactly
// one of them and nothing is recorded for the others.
//
// Every function takes `now` last. Callers leave it out; tests pass a fixed time.

import { withTransaction } from '../config/database.js'
import { ATTEMPTS_PER_CYCLE } from '../config/licenceExam.js'
import * as examDateRequestModel from '../models/examDateRequestModel.js'
import * as licenceExamModel from '../models/licenceExamModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { formatLongDate, getSchoolDate } from '../utils/dateUtils.js'
import { REJECTION_REASONS } from '../utils/validationUtils.js'
import {
  assertCanRequestDate,
  exhaustsCycle,
  getSummary,
  lockCurrentCycle,
  requiresReattemptFee,
} from './licenceExamService.js'
import { startFirstCycle } from './practicalService.js'
import { getSettings } from './settingsService.js'
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

// The examination result of a request. null until the request is approved; PENDING while
// the examination has no recorded result; otherwise the attempt it was recorded as.
const toResult = (row, attempt) => {
  if (row.status !== 'APPROVED') return null
  if (!attempt) return { status: 'PENDING' }
  const failed = attempt.result === 'FAILED'
  return {
    status: attempt.result,
    cycleNumber: attempt.cycle_number,
    attemptNumber: attempt.attempt_number,
    attemptsPerCycle: ATTEMPTS_PER_CYCLE,
    // Attempts left in that cycle after this one
    attemptsRemaining: failed ? ATTEMPTS_PER_CYCLE - attempt.attempt_number : 0,
    // What a failure costs: the reattempt fee for the next attempt of the cycle (after a
    // first or second failure), as fixed when the result was recorded. A failure that used
    // the last attempt costs no fee: the account is locked instead, until a reapplication
    // is approved.
    reattemptFee: failed && requiresReattemptFee(attempt.attempt_number) ? attempt.reattempt_fee : null,
    reapplicationRequired: failed && exhaustsCycle(attempt.attempt_number),
    examDate: attempt.exam_date,
    recordedAt: attempt.recorded_at,
  }
}

const toRequest = (row, attempt) => ({
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
  result: toResult(row, attempt),
})

// Request rows -> requests, each with the result recorded for it (if any)
const toRequests = async (rows, db) => {
  const attempts = await licenceExamModel.findAttemptsByRequestIds(
    rows.filter((row) => row.status === 'APPROVED').map((row) => row.id),
    db,
  )
  const attemptByRequest = new Map(attempts.map((attempt) => [attempt.exam_date_request_id, attempt]))
  return rows.map((row) => toRequest(row, attemptByRequest.get(row.id)))
}

// ---- Student. `student` is req.user: the signed-in account, never anything from the request.

// The student's own requests, newest first, and whether a new one may be submitted now
// (`summary` says why not: see licenceExamService.getSummary)
export const listOwn = async (student) => {
  const requests = await toRequests(await examDateRequestModel.findByUser(student.id))
  const { summary } = await getSummary(student.id)
  return { requests, canSubmit: summary.canRequestDate, summary }
}

export const getOwn = async (id, student) => {
  const request = await examDateRequestModel.findOwned(id, student.id)
  if (!request) throw new AppError(404, NOT_FOUND)
  return (await toRequests([request]))[0]
}

// Saves the request and tells the admins, in one transaction. `input` has already been
// validated: the medical report is confirmed and the dates are 1-3 future Tuesdays.
// Refused when the student has passed, has a request or a result outstanding, or has not
// yet had the reattempt payment for their last failure approved.
export const submit = async (student, { preferredDates }) => {
  // Outside the transaction, so that simultaneous first requests do not wait on each other
  await licenceExamModel.ensureFirstCycle(student.id)
  try {
    const requestId = await withTransaction(async (db) => {
      await assertCanRequestDate(student.id, db)
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
    return getOwn(requestId, student)
  } catch (error) {
    // Two submissions at the same moment: the UNIQUE key let only one through
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, ALREADY_PENDING)
    throw error
  }
}

// ---- Admin

export const list = async ({ status }) =>
  toRequests(await examDateRequestModel.findAll({ status }))

// The request plus where its student stands with their attempts (`attemptSummary`)
export const getDetails = async (id) => {
  const request = await examDateRequestModel.findById(id)
  if (!request) throw new AppError(404, NOT_FOUND)
  const { summary } = await getSummary(request.user_id)
  return { ...(await toRequests([request]))[0], attemptSummary: summary }
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

const RESULT_RECORDED = 'The result of this examination has already been recorded.'

// Records Passed or Failed for an approved booking and tells the student. This is what
// uses an attempt, and it happens once: the request row and the student's current cycle
// are locked, so a repeated or simultaneous request finds the result already there (and
// the UNIQUE keys on licence_exam_attempts refuse a second row whatever happens).
// A recorded result is final.
// A third failure also exhausts the cycle and locks the student's account, in the same
// transaction: from then on only an approved reapplication gives it access again.
export const recordResult = async (id, adminId, { result }, now = new Date()) => {
  try {
    await withTransaction(async (db) => {
      const request = await examDateRequestModel.findById(id, db, { forUpdate: true })
      if (!request) throw new AppError(404, NOT_FOUND)
      if (request.status !== 'APPROVED') {
        throw new AppError(409, 'A result can only be recorded for an approved examination date.')
      }
      const [existing] = await licenceExamModel.findAttemptsByRequestIds([id], db)
      if (existing) throw new AppError(409, RESULT_RECORDED)

      const cycle = await lockCurrentCycle(request.user_id, db)
      // Counted only after the cycle is locked, and read as they are now
      const attempts = await licenceExamModel.findAttemptsByUser(request.user_id, db, {
        forUpdate: true,
      })
      if (attempts.some((attempt) => attempt.result === 'PASSED')) {
        throw new AppError(409, 'This student has already passed the examination.')
      }
      const used = attempts.filter((attempt) => attempt.cycle_id === cycle.id).length
      if (used >= ATTEMPTS_PER_CYCLE) {
        throw new AppError(
          409,
          `This student has used all ${ATTEMPTS_PER_CYCLE} attempts of the current cycle. A new attempt cycle must be approved before another result can be recorded.`,
        )
      }

      // A first or second failure obliges the student to pay the reattempt fee in force now;
      // the amount is kept with the attempt, so a later change of the fee does not alter it
      const reattemptFee =
        result === 'FAILED' && requiresReattemptFee(used + 1) ? (await getSettings(db)).reattemptFee : null
      const attemptId = await licenceExamModel.createAttempt(
        {
          userId: request.user_id,
          cycleId: cycle.id,
          attemptNumber: used + 1,
          examDateRequestId: id,
          examDate: request.approved_date,
          result,
          reattemptFee,
          recordedBy: adminId,
          recordedAt: now,
        },
        db,
      )
      const accountLocked = result === 'FAILED' && exhaustsCycle(used + 1)
      // A pass makes the student eligible for practical training: the first practical cycle,
      // its provisional test date (approved exam date + 90 days, weekend -> Monday) and its
      // 10 lessons, saved once with the result (a result is final, so it is never redone)
      let practical = null
      if (result === 'PASSED') {
        await licenceExamModel.markCycleStatus(cycle.id, 'PASSED', db)
        practical = await startFirstCycle({ userId: request.user_id, attemptId, examDate: request.approved_date }, db)
      }
      if (accountLocked) {
        await licenceExamModel.markCycleStatus(cycle.id, 'EXHAUSTED', db)
        await userModel.setLocked(request.user_id, now, db)
        // Every session of the account ends for good: after the reapplication is approved
        // the student logs in again, an old session does not come back to life
        await userModel.incrementSessionVersion(request.user_id, db)
      }

      // Short text only: the details are shown from the request when it is opened
      await notify(
        request.user_id,
        result === 'PASSED'
          ? {
              type: NOTIFICATION_TYPES.examResultPassed,
              title: 'Driving School Exam Passed',
              message: practical
                ? `Congratulations! You passed your driving school exam. Your provisional practical test date is ${formatLongDate(practical.provisionalTestDate)}. Your instructor assignments and lessons will be arranged.`
                : 'Congratulations! You have passed your driving school exam.',
              examDateRequestId: id,
              practicalCycleId: practical?.cycleId ?? null,
            }
          : accountLocked
            ? {
                type: NOTIFICATION_TYPES.examAttemptsExhausted,
                title: 'Three Attempts Used — New Application Required',
                message:
                  'All three examination attempts have been used. Submit a new registration application with a new medical report, package and registration payment.',
                examDateRequestId: id,
              }
            : {
              type: NOTIFICATION_TYPES.examResultFailed,
              title: 'Driving Licence Exam Result',
              message: 'Your examination attempt was unsuccessful. Pay the reattempt fee to request another date.',
              examDateRequestId: id,
            },
        db,
      )
    })
  } catch (error) {
    // Two recordings at the same moment: the UNIQUE keys let only one through
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, RESULT_RECORDED)
    throw error
  }
  return getDetails(id)
}
