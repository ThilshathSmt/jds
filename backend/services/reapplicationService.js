// Business rules for reapplications: the new registration application a student must
// submit after failing all three attempts of an examination cycle.
//
//   The third failure locks the account (examDateRequestService.recordResult). A locked
//   student cannot log in, so the reapplication is submitted from a public page with the
//   Driving School ID and password: the credentials are checked on every request, and
//   nothing about an account is revealed without them.
//   A reapplication is a new registration application, like a first-time one: the
//   student's details, a package chosen from the catalogue, its minimum registration
//   payment with the receipt, and also the student's confirmation that they have obtained
//   a new medical report (the report itself is checked by the school). It never includes the
//   examination reattempt fee: a third failure costs none. It stays NEW until an admin
//   decides:
//     approve -> the same account is unlocked and a new cycle of three attempts starts
//     reject  -> the account stays locked; the student may submit another reapplication
//
// What the server alone decides, whatever a browser sends:
//   - who the student is (the verified credentials) and that they must reapply (the lock)
//   - the package name, price and minimum registration payment (config/packages.js)
//   - that nothing is accepted until an admin has approved the application
//   - that the student keeps their account: no user and no Driving School ID is created
//   - that an approval unlocks once and creates exactly one cycle
//
// Every function that changes something takes `now` last. Callers leave it out; tests
// pass a fixed time.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import { ATTEMPTS_PER_CYCLE } from '../config/licenceExam.js'
import { findPackageById, getMinimumPayment } from '../config/packages.js'
import * as applicationDocumentModel from '../models/applicationDocumentModel.js'
import * as examReattemptRequestModel from '../models/examReattemptRequestModel.js'
import * as licenceExamModel from '../models/licenceExamModel.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { MEDICAL_REPORT_NOT_OBTAINED_MESSAGE } from '../utils/validationUtils.js'
import { RECEIPT_TYPES, hasValidSignature } from '../utils/fileUtils.js'
import { verifyCredentials } from './authService.js'
import { getAttemptHistory, lockCurrentCycle } from './licenceExamService.js'
import { NOTIFICATION_TYPES, markApplicationNotificationsRead, notify, notifyRole } from './notificationService.js'

const NOT_FOUND = 'Registration application not found.'
const NOT_LOCKED = 'This account is not locked: no new application is needed. Please log in as usual.'
const ALREADY_PENDING =
  'You already have a new application awaiting review by the school. Your account stays locked until it is approved.'

const DECIDED_MESSAGES = {
  APPROVED: 'This application has already been approved.',
  REJECTED: 'This application has already been rejected and cannot be changed.',
}

// The upload field of the form and the application document it becomes. The new medical
// report is not uploaded: the student confirms they have obtained it. (Older
// reapplications carry it as a 'medical_report' document.)
const MEDICAL_REPORT_TYPE = 'medical_report'
const RECEIPT = { field: 'receipt', type: 'payment_receipt', label: 'payment receipt/document' }
const REQUIRED_DOCUMENTS = [RECEIPT]

// What a document of a reapplication is waiting for: it is verified by the admin's
// decision on the application, like the receipt of a first-time application
const VERIFICATION_BY_STATUS = { NEW: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' }

const toReapplication = (row) => ({
  id: row.id,
  status: row.status,
  rejectionReason: row.rejection_reason,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
})

// The student's current cycle and its attempts, when all of them have failed. Null when
// the current cycle is not exhausted.
const findExhaustedCycle = async (userId, db) => {
  const cycle = await licenceExamModel.findCurrentCycle(userId, db)
  if (!cycle) return null
  const attempts = (await licenceExamModel.findAttemptsByUser(userId, db)).filter(
    (attempt) => attempt.cycle_id === cycle.id,
  )
  if (attempts.length < ATTEMPTS_PER_CYCLE || attempts.some((attempt) => attempt.result === 'PASSED')) {
    return null
  }
  return { cycle, attempts }
}

// Checks the credentials and that the account is locked for a reapplication. The same
// answer is given for an unknown ID and a wrong password; only someone who knows the
// password learns anything about the account.
const verifyLockedStudent = async (credentials) => {
  const user = await verifyCredentials(credentials)
  if (user.role !== 'student' || user.locked_at === null) throw new AppError(409, NOT_LOCKED)
  return user
}

// ---- The locked student, identified by Driving School ID and password

// Where the reapplication stands, and what the form needs
export const getStatus = async (credentials) => {
  const user = await verifyLockedStudent(credentials)
  const [latest] = await applicationModel.findReapplicationsByUser(user.id)
  // The details the student gave before, to start the new form from
  const previous = latest ?? (await applicationModel.findFirstByDrivingSchoolId(user.driving_school_id))

  return {
    student: { name: user.name, drivingSchoolId: user.driving_school_id },
    attemptsPerCycle: ATTEMPTS_PER_CYCLE,
    // NONE: nothing submitted yet | NEW: awaiting review | REJECTED: submit again
    applicationStatus: latest?.status === 'NEW' || latest?.status === 'REJECTED' ? latest.status : 'NONE',
    application: latest ? toReapplication(latest) : null,
    canSubmit: latest?.status !== 'NEW',
    lockedAt: user.locked_at,
    details: previous
      ? {
          fullName: previous.full_name,
          mobile: previous.mobile_number,
          email: previous.email ?? '',
          nic: previous.nic,
          address: previous.address,
        }
      : null,
  }
}

// `files` is req.files from the upload middleware. Every required file must be there and
// its content must really be a PDF, JPG or PNG.
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

// Saves the reapplication for the existing account, with the medical report confirmation
// (already checked by validateReapplicationInput) and the registration payment receipt, and tells the admins: all in one transaction. Nothing is
// unlocked by it. Returns `{ status, unusedFiles }`: any other file sent with the form is
// not saved, and the caller removes it.
export const submit = async (credentials, input, files = {}) => {
  const user = await verifyLockedStudent(credentials)
  if (!(await findExhaustedCycle(user.id))) throw new AppError(409, NOT_LOCKED)
  if (input.newMedicalReportConfirmed !== true) {
    throw new AppError(400, MEDICAL_REPORT_NOT_OBTAINED_MESSAGE, {
      newMedicalReportConfirmed: MEDICAL_REPORT_NOT_OBTAINED_MESSAGE,
    })
  }
  await checkFiles(files, REQUIRED_DOCUMENTS)

  // The package and what must be paid for it come from the server's own catalogue
  const selectedPackage = findPackageById(input.packageId)

  try {
    await withTransaction(async (db) => {
      // Locked for the transaction, and looked at again: this is what the saved rows rely on
      const locked = await userModel.findById(user.id, db, { forUpdate: true })
      if (!locked || locked.locked_at === null) throw new AppError(409, NOT_LOCKED)
      if (await applicationModel.findPendingReapplication(user.id, db)) {
        throw new AppError(409, ALREADY_PENDING)
      }
      if (!(await findExhaustedCycle(user.id, db))) throw new AppError(409, NOT_LOCKED)

      const applicationId = await applicationModel.createReapplication(
        {
          userId: user.id,
          ...input,
          // Never saved without an explicit confirmation, whoever calls this
          newMedicalReportConfirmed: input.newMedicalReportConfirmed === true,
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          packagePrice: selectedPackage.price,
          minimumPayment: getMinimumPayment(selectedPackage.price),
        },
        db,
      )
      for (const { field, type } of REQUIRED_DOCUMENTS) {
        const file = files[field][0]
        await applicationDocumentModel.create(
          {
            applicationId,
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
          type: NOTIFICATION_TYPES.reapplicationSubmitted,
          title: 'New reapplication',
          message: `${user.name} (${user.driving_school_id}) has submitted a new application after three failed examination attempts.`,
          registrationApplicationId: applicationId,
        },
        db,
      )
    })
  } catch (error) {
    // Two submissions at the same moment: the UNIQUE keys let only one through
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, ALREADY_PENDING)
    throw error
  }

  const unusedFiles = Object.entries(files)
    .filter(([field]) => !REQUIRED_DOCUMENTS.some((document) => document.field === field))
    .flatMap(([, list]) => list)
  return { status: await getStatus(credentials), unusedFiles }
}

// ---- Admin

// What the admin sees of a reapplication beyond the application itself: the account it
// belongs to, the student's earlier applications, every examination cycle and attempt,
// and what is being verified with this application
export const getReviewDetails = async (application) => {
  const user = await userModel.findById(application.user_id)
  const reapplications = await applicationModel.findReapplicationsByUser(application.user_id)
  const first = user ? await applicationModel.findFirstByDrivingSchoolId(user.driving_school_id) : null
  const documents = await applicationDocumentModel.findByApplicationId(application.id)
  const cycles = await licenceExamModel.findCyclesByUser(application.user_id)
  // The cycle this application ends: the one before the cycle it started, or the current
  // one while it is undecided
  const startedCycle = cycles.find((cycle) => cycle.application_id === application.id) ?? null
  const endedCycle = startedCycle
    ? (cycles.find((cycle) => cycle.cycle_number === startedCycle.cycle_number - 1) ?? null)
    : (cycles.at(-1) ?? null)
  // Only reapplications from before the reattempt-fee rule changed have one
  const [legacyPayment] = (await examReattemptRequestModel.findByUser(application.user_id)).filter(
    (request) => request.reapplication_id === application.id,
  )
  const verification = VERIFICATION_BY_STATUS[application.status] ?? 'PENDING'
  const toCycle = (cycle) => ({
    cycleNumber: cycle.cycle_number,
    applicationId: cycle.application_id,
    status: cycle.status,
    attemptsUsed: cycle.attempts_used,
    attemptsFailed: cycle.attempts_failed,
    createdAt: cycle.created_at,
  })

  return {
    student: user
      ? {
          id: user.id,
          name: user.name,
          drivingSchoolId: user.driving_school_id,
          accountStatus: user.status,
          locked: user.locked_at !== null,
          lockedAt: user.locked_at,
        }
      : null,
    // Oldest first: the application the student registered with, then earlier reapplications
    previousApplications: [...(first ? [first] : []), ...reapplications.toReversed()]
      .filter((row) => row.id !== application.id)
      .map((row) => ({
        id: row.id,
        type: row.application_type,
        status: row.status,
        createdAt: row.created_at,
        rejectionReason: row.rejection_reason,
      })),
    attemptsPerCycle: ATTEMPTS_PER_CYCLE,
    cycles: cycles.map(toCycle),
    // The cycle whose three failures led to this application, and the one it started
    exhaustedCycle: endedCycle ? toCycle(endedCycle) : null,
    startedCycle: startedCycle ? toCycle(startedCycle) : null,
    attempts: await getAttemptHistory(application.user_id),
    medicalReport: {
      // The student's answer to "Have you obtained a new medical report?"
      confirmed: application.new_medical_report_confirmed === 1,
      // Only older reapplications have the report as an uploaded document
      uploaded: documents.some((document) => document.document_type === MEDICAL_REPORT_TYPE),
      status: verification,
    },
    registrationPayment: {
      receiptSubmitted: documents.some((document) => document.document_type === RECEIPT.type),
      status: verification,
    },
    // A reattempt fee for the third failure, from before that fee was dropped
    legacyPayment: legacyPayment
      ? {
          id: legacyPayment.id,
          status: legacyPayment.status,
          feeAmount: legacyPayment.fee_amount,
          paymentMethod: legacyPayment.payment_method,
        }
      : null,
  }
}

// Locks the application, checks it is a reapplication that can still be decided, runs
// `applyDecision(application, db)` and marks the admins' notifications about it as read.
// Locking the row makes a second, simultaneous decision wait and then see the first one.
const decide = async (id, now, applyDecision) => {
  await withTransaction(async (db) => {
    const application = await applicationModel.findById(id, db, { forUpdate: true })
    if (!application || application.application_type !== 'REAPPLICATION') {
      throw new AppError(404, NOT_FOUND)
    }
    if (application.status !== 'NEW') {
      throw new AppError(409, DECIDED_MESSAGES[application.status] ?? 'This application can no longer be changed.')
    }
    await applyDecision(application, db)
    await markApplicationNotificationsRead(id, NOTIFICATION_TYPES.reapplicationSubmitted, now, db)
  })
}

// A reattempt payment for the third failure submitted with the application before that fee
// was dropped, still undecided. It is decided with the application so that it does not
// stay pending (one pending payment per student).
const findLegacyPayment = async (application, db) =>
  (await examReattemptRequestModel.findByUser(application.user_id, db)).find(
    (request) => request.reapplication_id === application.id && request.status === 'PENDING',
  ) ?? null

// The admin has verified the new medical report (through the school's own process) and the
// registration payment. The same
// account is unlocked, with the same Driving School ID, and starts a new cycle of three
// attempts. Earlier cycles, results, applications and payments are not touched.
export const approve = async (id, adminId, now = new Date()) => {
  try {
    await decide(id, now, async (application, db) => {
      const user = await userModel.findById(application.user_id, db, { forUpdate: true })
      if (!user || user.role !== 'student') throw new AppError(409, 'The student account of this application no longer exists.')
      if (user.locked_at === null) {
        throw new AppError(409, 'This student account is not locked, so it does not need a reapplication.')
      }

      // Whoever holds the cycle is the only one adding a cycle for this student
      const current = await lockCurrentCycle(user.id, db)
      const exhausted = await findExhaustedCycle(user.id, db)
      if (!exhausted || exhausted.cycle.id !== current.id) {
        throw new AppError(409, `This student has not used all ${ATTEMPTS_PER_CYCLE} attempts of the current cycle.`)
      }
      const documents = await applicationDocumentModel.findByApplicationId(id, db)
      // Confirmed by the student (or, on older reapplications, uploaded)
      const medicalReport = documents.findLast((document) => document.document_type === MEDICAL_REPORT_TYPE)
      if (application.new_medical_report_confirmed !== 1 && !medicalReport) {
        throw new AppError(409, 'The student has not confirmed obtaining a new medical report, so this application cannot be approved.')
      }
      if (!documents.some((document) => document.document_type === RECEIPT.type)) {
        throw new AppError(409, 'This application has no registration payment receipt and cannot be approved.')
      }

      const legacyPayment = await findLegacyPayment(application, db)
      if (legacyPayment) {
        await examReattemptRequestModel.markApproved(legacyPayment.id, { reviewedBy: adminId, reviewedAt: now }, db)
      }

      const changed = await applicationModel.markReapplicationApproved(
        id,
        { reviewedBy: adminId, reviewedAt: now },
        db,
      )
      if (!changed) throw new AppError(409, DECIDED_MESSAGES.APPROVED)

      // UNIQUE (user_id, cycle_number) and UNIQUE (application_id) refuse a second cycle
      await licenceExamModel.createCycle(
        {
          userId: user.id,
          cycleNumber: current.cycle_number + 1,
          applicationId: id,
          medicalReportDocumentId: medicalReport?.id ?? null,
        },
        db,
      )
      await userModel.setLocked(user.id, null, db)
      await notify(
        user.id,
        {
          type: NOTIFICATION_TYPES.reapplicationApproved,
          title: 'New Application Approved',
          message: `Your account has been reactivated. Log in with the same Driving School ID (${user.driving_school_id}) and password.`,
          registrationApplicationId: id,
        },
        db,
      )
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, DECIDED_MESSAGES.APPROVED)
    throw error
  }
}

// The account stays locked; the application and its documents are kept. A reattempt
// payment that came with it (older reapplications only) is rejected with it.
export const reject = async (id, adminId, { reason }, now = new Date()) =>
  decide(id, now, async (application, db) => {
    const changed = await applicationModel.markReapplicationRejected(
      id,
      { reason, reviewedBy: adminId, reviewedAt: now },
      db,
    )
    if (!changed) throw new AppError(409, DECIDED_MESSAGES.REJECTED)

    const legacyPayment = await findLegacyPayment(application, db)
    if (legacyPayment) {
      await examReattemptRequestModel.markRejected(
        legacyPayment.id,
        {
          medicalReportStatus: legacyPayment.medical_report_status,
          paymentStatus: 'REJECTED',
          reason: `Submitted with reapplication #${id}, which was rejected: ${reason}`.slice(0, 300),
          reviewedBy: adminId,
          reviewedAt: now,
        },
        db,
      )
    }
    await notify(
      application.user_id,
      {
        type: NOTIFICATION_TYPES.reapplicationRejected,
        title: 'New Application Rejected',
        message: `Your new application was not approved and your account remains locked. Reason: ${reason.replace(/[.\s]+$/, '')}.`,
        registrationApplicationId: id,
      },
      db,
    )
  })

// ---- The student, once signed in again

// One of the student's own reapplications, for the notification that links to it
export const getOwn = async (id, student) => {
  const application = (await applicationModel.findReapplicationsByUser(student.id)).find(
    (row) => row.id === id,
  )
  if (!application) throw new AppError(404, NOT_FOUND)
  return { ...toReapplication(application), drivingSchoolId: student.drivingSchoolId }
}
