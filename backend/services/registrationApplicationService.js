// Business rules for registration applications (the public "Apply Now" form) and their
// review by an admin. Submitting an application never creates a login account.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import * as applicationDocumentModel from '../models/applicationDocumentModel.js'
import * as drivingSchoolIdModel from '../models/drivingSchoolIdModel.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import AppError from '../utils/AppError.js'
import {
  RECEIPT_TYPES,
  getApplicationFilePath,
  hasValidSignature,
  removeFile,
} from '../utils/fileUtils.js'
import { issueDrivingSchoolId } from './provisioningService.js'
import * as reapplicationService from './reapplicationService.js'
import { quoteRegistration } from './settingsService.js'

const NOT_FOUND = 'Registration application not found.'
const REAPPLICATION = 'REAPPLICATION'

const toSummary = (row) => ({
  id: row.id,
  fullName: row.full_name,
  mobileNumber: row.mobile_number,
  packageName: row.package_name,
  status: row.status,
  // NEW_STUDENT: a first-time application, which is given a Driving School ID on approval.
  // REAPPLICATION: from an existing student after three failed examination attempts;
  // `drivingSchoolId` is then the ID that student already has.
  type: row.application_type,
  drivingSchoolId: row.driving_school_id ?? row.student_driving_school_id ?? null,
  createdAt: row.created_at,
})

const toDocument = (row) => ({
  id: row.id,
  type: row.document_type,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
})

const toDetails = (row, documents) => ({
  ...toSummary(row),
  email: row.email,
  nic: row.nic,
  address: row.address,
  packageId: row.package_id,
  packagePrice: row.package_price,
  minimumPayment: row.minimum_payment,
  paymentMethod: row.payment_method,
  approvedAt: row.approved_at,
  rejectionReason: row.rejection_reason,
  reviewedAt: row.reviewed_at,
  // True once the applicant has created their login account with the issued ID
  accountRegistered: row.account_user_id !== null,
  // True when the student's account was later deleted by an admin (the ID is withdrawn)
  accountDeleted: row.account_user_id === null && row.driving_school_id_status === 'revoked',
  documents: documents.map(toDocument),
})

const loadDetails = async (id) => {
  const application = await applicationModel.findById(id)
  if (!application) throw new AppError(404, NOT_FOUND)
  const details = toDetails(application, await applicationDocumentModel.findByApplicationId(id))
  // A reapplication is reviewed against the student's account and examination history
  if (application.application_type !== REAPPLICATION) return details
  return { ...details, reapplication: await reapplicationService.getReviewDetails(application) }
}

// Public: store a new application with its receipt. Status always starts as NEW;
// the package name, price and minimum payment are copied from the database's current
// package and advance payment setting (settingsService.quoteRegistration).
export const submit = async (input, file) => {
  const mimeType = RECEIPT_TYPES[path.extname(file.originalname).toLowerCase()]
  if (!(await hasValidSignature(file.path, mimeType))) {
    const message = 'The uploaded file is not a valid PDF, JPG, JPEG or PNG file.'
    throw new AppError(400, message, { receipt: message })
  }

  const applicationId = await withTransaction(async (db) => {
    const terms = await quoteRegistration(input.packageId, input.quotedMinimumPayment, db)
    const newId = await applicationModel.create({ ...input, ...terms }, db)
    await applicationDocumentModel.create(
      {
        applicationId: newId,
        documentType: 'payment_receipt',
        originalName: path.basename(file.originalname).slice(0, 255),
        storedName: file.filename,
        mimeType,
        sizeBytes: file.size,
      },
      db,
    )
    return newId
  })

  return { id: applicationId, status: 'NEW' }
}

export const list = async ({ status, type }) =>
  (await applicationModel.findAll({ status, type })).map(toSummary)

export const getDetails = loadDetails

// Approves a NEW application and issues its student Driving School ID, all in one
// transaction: either the application is approved with an ID, or nothing changes.
// No user account is created here; the applicant registers with the ID afterwards.
// A reapplication is approved differently: the existing account is unlocked and nothing
// is issued (see reapplicationService.approve).
export const approve = async (id, adminId) => {
  const existing = await applicationModel.findById(id)
  if (!existing) throw new AppError(404, NOT_FOUND)
  if (existing.application_type === REAPPLICATION) {
    await reapplicationService.approve(id, adminId)
    return loadDetails(id)
  }

  await withTransaction(async (db) => {
    // Locking the row makes a second, simultaneous approval wait and then see APPROVED
    const application = await applicationModel.findById(id, db, { forUpdate: true })
    if (!application) throw new AppError(404, NOT_FOUND)
    if (application.status === 'APPROVED') {
      throw new AppError(409, 'This application has already been approved.')
    }
    if (application.status !== 'NEW') {
      throw new AppError(409, 'Only a NEW application can be approved.')
    }

    const drivingSchoolId = await issueDrivingSchoolId({ role: 'student', createdBy: adminId }, db)
    await applicationModel.markApproved(id, drivingSchoolId, db)
  })
  return loadDetails(id)
}

// Rejects a reapplication with a reason: the student's account stays locked. First-time
// applications are suspended instead.
export const reject = async (id, adminId, input) => {
  const existing = await applicationModel.findById(id)
  if (!existing) throw new AppError(404, NOT_FOUND)
  if (existing.application_type !== REAPPLICATION) {
    throw new AppError(409, 'Only a reapplication can be rejected with a reason. Suspend a first-time application instead.')
  }
  await reapplicationService.reject(id, adminId, input)
  return loadDetails(id)
}

// A suspended application never receives a Driving School ID
export const suspend = async (id) => {
  await withTransaction(async (db) => {
    const application = await applicationModel.findById(id, db, { forUpdate: true })
    if (!application) throw new AppError(404, NOT_FOUND)
    if (application.application_type === REAPPLICATION) {
      throw new AppError(409, 'A reapplication is approved or rejected, not suspended.')
    }
    if (application.status !== 'NEW') {
      throw new AppError(409, 'Only a NEW application can be suspended.')
    }
    await applicationModel.markSuspended(id, db)
  })
  return loadDetails(id)
}

// Deletes the application and its uploaded files. Never touches a user account:
// once the applicant has registered, the application can no longer be deleted.
export const remove = async (id) => {
  const documents = await withTransaction(async (db) => {
    const application = await applicationModel.findById(id, db, { forUpdate: true })
    if (!application) throw new AppError(404, NOT_FOUND)
    // Part of a student's history: it and its documents are kept
    if (application.application_type === REAPPLICATION) {
      throw new AppError(409, 'A reapplication is part of the student\'s record and cannot be deleted.')
    }
    if (application.account_user_id !== null) {
      throw new AppError(
        409,
        'This application belongs to a registered student account and cannot be deleted.',
      )
    }
    // Kept as the record of a student whose account has since been deleted
    if (application.driving_school_id_status === 'revoked') {
      throw new AppError(
        409,
        'This application is the record of a deleted student account and cannot be deleted.',
      )
    }

    const applicationDocuments = await applicationDocumentModel.findByApplicationId(id, db)
    await applicationModel.remove(id, db)
    // An approved but unused ID must not stay usable after its application is gone
    if (application.driving_school_id) {
      await drivingSchoolIdModel.revokeIfAvailable(application.driving_school_id, db)
    }
    return applicationDocuments
  })

  // Files are removed only after the database change has been committed
  await Promise.all(documents.map((document) => removeFile(getApplicationFilePath(document.stored_name))))
}

const DOWNLOAD_NAMES = { payment_receipt: 'receipt', medical_report: 'medical-report' }

// Admin-only: where to find a document on disk and how to serve it
export const getDocumentFile = async (applicationId, documentId) => {
  const document = await applicationDocumentModel.findOne(applicationId, documentId)
  if (!document) throw new AppError(404, 'Document not found.')
  return {
    storedName: document.stored_name,
    mimeType: document.mime_type,
    // A server-made name, so nothing from the upload ends up in a response header
    downloadName: `application-${applicationId}-${DOWNLOAD_NAMES[document.document_type] ?? 'document'}${path.extname(document.stored_name)}`,
  }
}
