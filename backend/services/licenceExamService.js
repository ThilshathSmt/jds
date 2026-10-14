// Attempts at the physical driving licence examination: how many a student has used,
// what they owe, what they may do next, and the history behind it.
//
//   An attempt is used only when an admin records Passed or Failed for an approved exam
//   date request (examDateRequestService.recordResult). Requesting a date, or having a
//   request rejected, uses nothing.
//   A cycle is three attempts and belongs to one approved registration application. Its
//   first attempt costs no reattempt fee. A first or second failure costs the reattempt fee
//   (config/licenceExam.js): the student may not request the next date until an admin has
//   approved the payment for that failure (examReattemptRequestService.approve).
//   The third failure costs no fee, because the cycle has no attempt left: it exhausts the
//   cycle and locks the account. The student must submit a new registration application
//   with a new medical report, a package and the normal registration payment
//   (reapplicationService.js). Approving it unlocks the same account and starts the next
//   cycle, whose fee rules start again from its first attempt.
//   A student who has passed owes nothing and needs nothing more.
//
// Everything here is worked out from the database rows, never from notifications or from
// anything the browser sends.

import pool from '../config/database.js'
import { ATTEMPTS_PER_CYCLE, REATTEMPT_FEE } from '../config/licenceExam.js'
import * as examDateRequestModel from '../models/examDateRequestModel.js'
import * as examReattemptRequestModel from '../models/examReattemptRequestModel.js'
import * as licenceExamModel from '../models/licenceExamModel.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'

export const FEE_TEXT = `LKR ${REATTEMPT_FEE.toLocaleString('en-US')}`

// A failure that used the last attempt of its cycle exhausts the cycle: the account is
// locked until a reapplication is approved
export const exhaustsCycle = (attemptNumber) => attemptNumber >= ATTEMPTS_PER_CYCLE

// A failure that leaves another attempt in its cycle costs the reattempt fee (attempts 1
// and 2); the failure of the last attempt does not
export const requiresReattemptFee = (attemptNumber) => !exhaustsCycle(attemptNumber)

// What the student is told for each state. The same text is used when a request is refused.
const MESSAGES = {
  PASSED: 'Congratulations! You have passed your driving licence examination. No further examination requests are needed.',
  DATE_REQUEST_PENDING:
    'You already have an exam date request awaiting admin review. You can submit a new request once it has been reviewed.',
  RESULT_PENDING:
    'Your examination date has been approved. You can request another date after the result of that examination has been recorded.',
  REATTEMPT_PAYMENT_REQUIRED: `Your examination attempt was unsuccessful. Please pay the ${FEE_TEXT} reattempt fee and upload your payment receipt. You can request another examination date after your payment is approved.`,
  REATTEMPT_PAYMENT_PENDING:
    'Your reattempt payment is awaiting verification by the school. You can request another examination date after it is approved.',
  REATTEMPT_PAYMENT_REJECTED: `Your reattempt payment was not approved. Review the reason, then upload valid proof of the ${FEE_TEXT} payment again.`,
  REAPPLICATION_REQUIRED: `You have used all ${ATTEMPTS_PER_CYCLE} examination attempts. Submit a new registration application with a new medical report, choose a package and make the registration payment. Your account will be reactivated after admin approval.`,
  REAPPLICATION_PENDING:
    'Your new application is awaiting review by the school. Your account stays locked until it is approved.',
  REAPPLICATION_REJECTED:
    'Your new application was not approved. Your account stays locked. Review the reason and submit a new application with a new medical report.',
}

const canRequestMessage = (used, remaining) => {
  if (used === 0) return `You have ${remaining} attempts available. Request an examination date when you are ready.`
  if (remaining === 1) {
    return `This is your last attempt. If you fail again, your account will be locked and you must submit a new registration application with a new medical report.`
  }
  return `You have ${remaining} attempts remaining with your current medical report.`
}

export const toAttempt = (row) => ({
  id: row.id,
  cycleNumber: row.cycle_number,
  attemptNumber: row.attempt_number,
  attemptsPerCycle: ATTEMPTS_PER_CYCLE,
  examDateRequestId: row.exam_date_request_id,
  examDate: row.exam_date,
  result: row.result,
  recordedAt: row.recorded_at,
})

// Where the student stands right now. `db` is a transaction connection when the answer is
// used to decide something, so that the decision and the rows it is based on agree.
//   status: PASSED | DATE_REQUEST_PENDING | RESULT_PENDING | CAN_REQUEST
//         | REATTEMPT_PAYMENT_REQUIRED | REATTEMPT_PAYMENT_PENDING | REATTEMPT_PAYMENT_REJECTED
//         | REAPPLICATION_REQUIRED | REAPPLICATION_PENDING | REAPPLICATION_REJECTED (locked)
export const getSummary = async (userId, db = pool) => {
  // Every student has a first cycle; it is created the first time anything asks
  let cycle = await licenceExamModel.findCurrentCycle(userId, db)
  if (!cycle) {
    await licenceExamModel.ensureFirstCycle(userId, db)
    cycle = await licenceExamModel.findCurrentCycle(userId, db)
  }
  // Oldest first, so the last one is the student's most recent examination
  const attempts = await licenceExamModel.findAttemptsByUser(userId, db)
  const lastAttempt = attempts.at(-1) ?? null
  const used = attempts.filter((attempt) => attempt.cycle_id === cycle.id).length
  const remaining = Math.max(0, ATTEMPTS_PER_CYCLE - used)
  const passed = attempts.some((attempt) => attempt.result === 'PASSED')

  const pendingRequest = await examDateRequestModel.findPendingByUser(userId, db)
  const awaitingResult = await examDateRequestModel.findAwaitingResultByUser(userId, db)

  // The most recent failure has to be paid for before anything else can happen, when it is
  // a first or second failure of the current cycle. A third failure is never paid for, and
  // a new cycle never inherits a payment from an earlier one. Its newest reattempt
  // request, if any, says how far that has got.
  const failedAttempt =
    !passed &&
    lastAttempt?.result === 'FAILED' &&
    lastAttempt.cycle_id === cycle.id &&
    requiresReattemptFee(lastAttempt.attempt_number)
      ? lastAttempt
      : null
  const reattemptRequest = failedAttempt
    ? ((await examReattemptRequestModel.findByUser(userId, db)).find(
        (request) => request.failed_attempt_id === failedAttempt.id,
      ) ?? null)
    : null
  const paid = reattemptRequest?.status === 'APPROVED'
  const owing = Boolean(failedAttempt) && !paid

  // Locked after a third failure, until a reapplication is approved
  const user = await userModel.findById(userId, db)
  const locked = Boolean(user) && user.locked_at !== null
  const reapplication = locked
    ? ((await applicationModel.findReapplicationsByUser(userId, db))[0] ?? null)
    : null

  let status
  if (passed) status = 'PASSED'
  else if (locked) {
    status =
      reapplication?.status === 'NEW'
        ? 'REAPPLICATION_PENDING'
        : reapplication?.status === 'REJECTED'
          ? 'REAPPLICATION_REJECTED'
          : 'REAPPLICATION_REQUIRED'
  } else if (pendingRequest) status = 'DATE_REQUEST_PENDING'
  else if (awaitingResult) status = 'RESULT_PENDING'
  else if (owing) {
    status =
      reattemptRequest?.status === 'PENDING'
        ? 'REATTEMPT_PAYMENT_PENDING'
        : reattemptRequest?.status === 'REJECTED'
          ? 'REATTEMPT_PAYMENT_REJECTED'
          : 'REATTEMPT_PAYMENT_REQUIRED'
  } else status = 'CAN_REQUEST'

  const activeRequest = pendingRequest ?? awaitingResult
  return {
    // Not sent to the browser: used by the services that act on the summary
    internal: { cycle, used, failedAttempt: owing ? failedAttempt : null },
    summary: {
      status,
      message: MESSAGES[status] ?? canRequestMessage(used, remaining),
      cycleNumber: cycle.cycle_number,
      attemptsPerCycle: ATTEMPTS_PER_CYCLE,
      attemptsUsed: used,
      attemptsRemaining: remaining,
      // The attempt the next recorded result would be
      nextAttemptNumber: remaining > 0 ? used + 1 : null,
      passed,
      lastResult: lastAttempt
        ? {
            status: lastAttempt.result,
            cycleNumber: lastAttempt.cycle_number,
            attemptNumber: lastAttempt.attempt_number,
            examDate: lastAttempt.exam_date,
          }
        : null,
      canRequestDate: status === 'CAN_REQUEST',
      // From the student's account, after a first or second failure of the cycle
      canPayReattemptFee:
        status === 'REATTEMPT_PAYMENT_REQUIRED' || status === 'REATTEMPT_PAYMENT_REJECTED',
      // The account is locked: only an approved reapplication gives it access again
      locked,
      reapplication: reapplication ? { id: reapplication.id, status: reapplication.status } : null,
      reattemptFee: REATTEMPT_FEE,
      // For the most recent failure. NOT_REQUIRED: nothing owed (no failure, or passed)
      // REQUIRED: owed, nothing submitted | PENDING: awaiting verification
      // REJECTED: must be submitted again | APPROVED: paid and verified
      paymentStatus: !failedAttempt
        ? 'NOT_REQUIRED'
        : !reattemptRequest
          ? 'REQUIRED'
          : reattemptRequest.status,
      // VALID: covers the attempts left | NEW_REQUIRED: a new one comes with the reapplication
      // UNDER_REVIEW: a reapplication is being checked | NOT_NEEDED: the student has passed
      medicalReport: passed
        ? 'NOT_NEEDED'
        : !locked
          ? 'VALID'
          : status === 'REAPPLICATION_PENDING'
            ? 'UNDER_REVIEW'
            : 'NEW_REQUIRED',
      // The failure the payment is for, while it is still owed
      failedAttempt: owing
        ? {
            cycleNumber: failedAttempt.cycle_number,
            attemptNumber: failedAttempt.attempt_number,
            examDate: failedAttempt.exam_date,
          }
        : null,
      reattemptRequestId: owing ? (reattemptRequest?.id ?? null) : null,
      activeRequest: activeRequest
        ? {
            id: activeRequest.id,
            status: activeRequest.status,
            approvedDate: activeRequest.approved_date,
          }
        : null,
    },
  }
}

// Locks the student's current cycle for the surrounding transaction, creating the first
// cycle if the student has none yet. Whoever holds it is the only one counting attempts
// or adding a cycle for this student.
export const lockCurrentCycle = async (userId, db) => {
  const cycle = await licenceExamModel.findCurrentCycle(userId, db, { forUpdate: true })
  if (cycle) return cycle
  await licenceExamModel.ensureFirstCycle(userId, db)
  return licenceExamModel.findCurrentCycle(userId, db, { forUpdate: true })
}

// Refuses a new exam date request unless the student may make one now: not passed, no
// request or result outstanding, and the last failure (if any) paid for and approved
export const assertCanRequestDate = async (userId, db) => {
  const { summary } = await getSummary(userId, db)
  if (!summary.canRequestDate) throw new AppError(409, summary.message)
}

// Every recorded attempt of the student, oldest first, across all cycles
export const getAttemptHistory = async (userId, db = pool) =>
  (await licenceExamModel.findAttemptsByUser(userId, db)).map(toAttempt)
