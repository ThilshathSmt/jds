// Business rules for reattempt payments: the fee a student owes after a failed
// examination before they may request another date.
//
//   A first or second failure of a cycle needs its own payment of the reattempt fee, with
//   a receipt. The student submits it here (PENDING) and an admin checks it:
//     approve -> the student may request an examination date again
//     reject  -> nothing is unlocked; the student may submit valid proof again
//   The third failure of a cycle costs no fee: it locks the account and the student
//   submits a new registration application instead (reapplicationService.js). (Rows from
//   before that rule, paid for a third failure with a reapplication, are decided together
//   with that reapplication, never here.)
//
// What the server alone decides, whatever a browser sends:
//   - who the student is, and which failed attempt the payment is for (always their most
//     recent failure that has no approved payment yet)
//   - the fee
//   - that nothing counts as accepted until an admin has approved it: uploading a receipt
//     approves nothing
//   - that a failure is approved once
//
// Every function that changes something takes `now` last. Callers leave it out; tests
// pass a fixed time.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import { ATTEMPTS_PER_CYCLE, REATTEMPT_FEE } from '../config/licenceExam.js'
import * as examReattemptRequestModel from '../models/examReattemptRequestModel.js'
import * as licenceExamModel from '../models/licenceExamModel.js'
import AppError from '../utils/AppError.js'
import { RECEIPT_TYPES, hasValidSignature } from '../utils/fileUtils.js'
import { exhaustsCycle, getAttemptHistory, getSummary } from './licenceExamService.js'
import {
  NOTIFICATION_TYPES,
  markReattemptNotificationsRead,
  notify,
  notifyRole,
} from './notificationService.js'

const NOT_FOUND = 'Reattempt payment not found.'
const ALREADY_PENDING = 'You already have a reattempt payment awaiting verification by the school.'
const ALREADY_APPROVED = 'The payment for this failed attempt has already been approved.'

const DECIDED_MESSAGES = {
  APPROVED: 'This payment has already been approved.',
  REJECTED: 'This payment has already been rejected and cannot be changed.',
}

const WITH_REAPPLICATION =
  "This payment is for a third failed attempt, which no longer needs a reattempt fee. It is decided together with the student's reapplication on the Registration Forms page."

// The upload field of the form and the document it becomes
const RECEIPT = { field: 'receipt', type: 'payment_receipt', label: 'payment receipt' }

const toDocument = (row) => ({
  id: row.id,
  type: row.document_type,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
})

const toRequest = (row, documents) => {
  const medicalReportRequired = row.medical_report_required === 1
  return {
    id: row.id,
    studentName: row.student_name,
    drivingSchoolId: row.driving_school_id,
    // The failed attempt this payment is for
    cycleNumber: row.cycle_number,
    attemptNumber: row.attempt_number,
    attemptsPerCycle: ATTEMPTS_PER_CYCLE,
    examDate: row.exam_date,
    previousResult: row.attempt_result,
    // Only on rows from before reapplications existed, when a third failure was settled
    // here with a new medical report
    medicalReportRequired,
    // A third failure's payment comes with a reapplication and is decided with it
    reapplicationId: row.reapplication_id,
    decidedWithReapplication:
      row.reapplication_id !== null || (!medicalReportRequired && exhaustsCycle(row.attempt_number)),
    feeAmount: row.fee_amount,
    paymentMethod: row.payment_method,
    status: row.status,
    paymentStatus: row.payment_status,
    medicalReportStatus: medicalReportRequired ? row.medical_report_status : 'NOT_REQUIRED',
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documents: documents.map(toDocument),
  }
}

const withDocuments = async (row) =>
  toRequest(row, await examReattemptRequestModel.findDocuments(row.id))

// ---- Student. `student` is req.user: the signed-in account, never anything from the request.

// Everything the Student panel shows about the physical examination: where the student
// stands, every recorded attempt, and their reattempt payments (newest first)
export const getOverview = async (student) => {
  const { summary } = await getSummary(student.id)
  const requests = await examReattemptRequestModel.findByUser(student.id)
  return {
    summary,
    attempts: await getAttemptHistory(student.id),
    reattemptRequests: await Promise.all(requests.map(withDocuments)),
  }
}

export const getOwn = async (id, student) => {
  const request = await examReattemptRequestModel.findOwned(id, student.id)
  if (!request) throw new AppError(404, NOT_FOUND)
  return withDocuments(request)
}

// `files` is req.files from the upload middleware: { receipt: [file], medicalReport: [file] }.
// Every required file must be there and its content must really be a PDF, JPG or PNG.
const checkFiles = async (files, required) => {
  const errors = {}
  for (const { field, label } of required) {
    const file = files[field]?.[0]
    if (!file) {
      errors[field] = `Please upload the ${label}.`
      continue
    }
    const mimeType = RECEIPT_TYPES[path.extname(file.originalname).toLowerCase()]
    if (!(await hasValidSignature(file.path, mimeType))) {
      errors[field] = 'The uploaded file is not a valid PDF, JPG, JPEG or PNG file.'
    }
  }
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Please correct the highlighted fields.', errors)
  }
}

// Why the student cannot submit a reattempt payment now
const refusal = (summary) => {
  if (summary.locked) return summary.message
  if (summary.status === 'REATTEMPT_PAYMENT_PENDING') return ALREADY_PENDING
  if (summary.passed) return 'You have passed the examination: no reattempt fee is required.'
  if (summary.paymentStatus === 'APPROVED') return ALREADY_APPROVED
  return 'A reattempt fee is only required after a failed examination attempt.'
}

// Saves the payment for the student's unpaid failure, with its receipt, and tells the
// admins: all in one transaction. It stays PENDING: nothing is accepted and no date can be
// requested until an admin approves it.
// Returns `{ request, unusedFiles }`: any other file sent with the form is not saved, and
// the caller removes it.
export const submit = async (student, { paymentMethod }, files = {}) => {
  // Outside the transaction, so that simultaneous first requests do not wait on each other
  await licenceExamModel.ensureFirstCycle(student.id)
  const { summary: before } = await getSummary(student.id)
  if (!before.canPayReattemptFee) throw new AppError(409, refusal(before))
  const required = [RECEIPT]
  await checkFiles(files, required)

  try {
    const requestId = await withTransaction(async (db) => {
      // Looked at again inside the transaction: this is what the saved row is based on
      const { summary, internal } = await getSummary(student.id, db)
      const { failedAttempt } = internal
      if (!summary.canPayReattemptFee) throw new AppError(409, refusal(summary))

      const newId = await examReattemptRequestModel.create(
        {
          userId: student.id,
          studentName: student.name,
          drivingSchoolId: student.drivingSchoolId,
          cycleId: failedAttempt.cycle_id,
          failedAttemptId: failedAttempt.id,
          medicalReportRequired: false,
          feeAmount: REATTEMPT_FEE,
          paymentMethod,
        },
        db,
      )
      for (const { field, type } of required) {
        const file = files[field][0]
        await examReattemptRequestModel.addDocument(
          {
            requestId: newId,
            documentType: type,
            originalName: path.basename(file.originalname).slice(0, 255),
            storedName: file.filename,
            mimeType: RECEIPT_TYPES[path.extname(file.originalname).toLowerCase()],
            sizeBytes: file.size,
          },
          db,
        )
      }
      await notifyRole(
        'admin',
        {
          type: NOTIFICATION_TYPES.examReattemptSubmitted,
          title: 'New reattempt payment',
          message: `${student.name} has submitted a reattempt payment for verification.`,
          examReattemptRequestId: newId,
        },
        db,
      )
      return newId
    })

    const unusedFiles = Object.entries(files)
      .filter(([field]) => !required.some((document) => document.field === field))
      .flatMap(([, list]) => list)
    return { request: await getOwn(requestId, student), unusedFiles }
  } catch (error) {
    // Two submissions at the same moment: the UNIQUE key let only one through
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, ALREADY_PENDING)
    throw error
  }
}

// Where to find one of the student's own documents on disk and how to serve it
export const getOwnDocumentFile = async (id, documentId, student) => {
  if (!(await examReattemptRequestModel.findOwned(id, student.id))) {
    throw new AppError(404, NOT_FOUND)
  }
  return getDocumentFile(id, documentId)
}

// ---- Admin

export const list = async ({ status }) =>
  Promise.all((await examReattemptRequestModel.findAll({ status })).map(withDocuments))

// The request, its documents and the student's attempt history and current standing
export const getDetails = async (id) => {
  const request = await examReattemptRequestModel.findById(id)
  if (!request) throw new AppError(404, NOT_FOUND)
  const { summary } = await getSummary(request.user_id)
  return {
    ...(await withDocuments(request)),
    attempts: await getAttemptHistory(request.user_id),
    attemptSummary: summary,
  }
}

// Locks the request, checks it can still be decided here, runs `applyDecision(request, db)`
// and marks the admins' notifications about it as read. Locking the row makes a second,
// simultaneous decision wait and then see the first one.
const decide = async (id, now, applyDecision) => {
  await withTransaction(async (db) => {
    const request = await examReattemptRequestModel.findById(id, db, { forUpdate: true })
    if (!request) throw new AppError(404, NOT_FOUND)
    if (request.status !== 'PENDING') throw new AppError(409, DECIDED_MESSAGES[request.status])
    // A third failure is settled by a reapplication, never by a payment
    if (request.reapplication_id !== null || exhaustsCycle(request.attempt_number)) {
      throw new AppError(409, WITH_REAPPLICATION)
    }

    await applyDecision(request, db)
    await markReattemptNotificationsRead(id, NOTIFICATION_TYPES.examReattemptSubmitted, now, db)
  })
  return getDetails(id)
}

// The admin has verified the payment: the student may request a date again
export const approve = async (id, adminId, now = new Date()) => {
  try {
    return await decide(id, now, async (request, db) => {
      // What the request claims is checked against the attempt itself
      if (request.attempt_result !== 'FAILED' || request.fee_amount !== REATTEMPT_FEE) {
        throw new AppError(409, 'This payment does not match a failed examination attempt and cannot be approved.')
      }
      // UNIQUE (failed_attempt_id, approved) refuses a second approved payment for the failure
      const changed = await examReattemptRequestModel.markApproved(
        id,
        { reviewedBy: adminId, reviewedAt: now },
        db,
      )
      if (!changed) throw new AppError(409, DECIDED_MESSAGES.APPROVED)
      await notify(
        request.user_id,
        {
          type: NOTIFICATION_TYPES.examReattemptApproved,
          title: 'Reattempt Payment Approved',
          message: 'Your reattempt payment has been approved. You can now request your next examination date.',
          examReattemptRequestId: id,
        },
        db,
      )
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, ALREADY_APPROVED)
    throw error
  }
}

// Nothing is unlocked: the student may submit valid proof again
export const reject = async (id, adminId, { reason }, now = new Date()) =>
  decide(id, now, async (request, db) => {
    const changed = await examReattemptRequestModel.markRejected(
      id,
      {
        medicalReportStatus: request.medical_report_status,
        paymentStatus: 'REJECTED',
        reason,
        reviewedBy: adminId,
        reviewedAt: now,
      },
      db,
    )
    if (!changed) throw new AppError(409, DECIDED_MESSAGES.REJECTED)
    await notify(
      request.user_id,
      {
        type: NOTIFICATION_TYPES.examReattemptRejected,
        title: 'Reattempt Payment Rejected',
        message: 'Your reattempt payment was not approved. Please review the reason and submit again.',
        examReattemptRequestId: id,
      },
      db,
    )
  })

const DOWNLOAD_NAMES = { medical_report: 'medical-report', payment_receipt: 'receipt' }

// Where to find a document on disk and how to serve it
export const getDocumentFile = async (id, documentId) => {
  const document = await examReattemptRequestModel.findDocument(id, documentId)
  if (!document) throw new AppError(404, 'Document not found.')
  return {
    storedName: document.stored_name,
    mimeType: document.mime_type,
    // A server-made name, so nothing from the upload ends up in a response header
    downloadName: `reattempt-${id}-${DOWNLOAD_NAMES[document.document_type]}${path.extname(document.stored_name)}`,
  }
}

