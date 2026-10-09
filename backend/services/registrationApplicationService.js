// Business rules for registration applications (the public "Apply Now" form) and their
// review by an admin. Submitting an application never creates a login account.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import { findPackageById, getMinimumPayment } from '../config/packages.js'
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

const NOT_FOUND = 'Registration application not found.'

const toSummary = (row) => ({
  id: row.id,
  fullName: row.full_name,
  mobileNumber: row.mobile_number,
  packageName: row.package_name,
  status: row.status,
  drivingSchoolId: row.driving_school_id,
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
  // True once the applicant has created their login account with the issued ID
  accountRegistered: row.account_user_id !== null,
  documents: documents.map(toDocument),
})

const loadDetails = async (id) => {
  const application = await applicationModel.findById(id)
  if (!application) throw new AppError(404, NOT_FOUND)
  return toDetails(application, await applicationDocumentModel.findByApplicationId(id))
}

// Public: store a new application with its receipt. Status always starts as NEW;
// the package name, price and minimum payment come from the server's own catalogue.
export const submit = async (input, file) => {
  const mimeType = RECEIPT_TYPES[path.extname(file.originalname).toLowerCase()]
  if (!(await hasValidSignature(file.path, mimeType))) {
    const message = 'The uploaded file is not a valid PDF, JPG, JPEG or PNG file.'
    throw new AppError(400, message, { receipt: message })
  }

  const selectedPackage = findPackageById(input.packageId)
  const applicationId = await withTransaction(async (db) => {
    const newId = await applicationModel.create(
      {
        ...input,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
        minimumPayment: getMinimumPayment(selectedPackage.price),
      },
      db,
    )
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

export const list = async ({ status }) =>
  (await applicationModel.findAll({ status })).map(toSummary)

export const getDetails = loadDetails

// Approves a NEW application and issues its student Driving School ID, all in one
// transaction: either the application is approved with an ID, or nothing changes.
// No user account is created here; the applicant registers with the ID afterwards.
export const approve = async (id, adminId) => {
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

// A suspended application never receives a Driving School ID
export const suspend = async (id) => {
  await withTransaction(async (db) => {
    const application = await applicationModel.findById(id, db, { forUpdate: true })
    if (!application) throw new AppError(404, NOT_FOUND)
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
    if (application.account_user_id !== null) {
      throw new AppError(
        409,
        'This application belongs to a registered student account and cannot be deleted.',
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

// Admin-only: where to find a document on disk and how to serve it
export const getDocumentFile = async (applicationId, documentId) => {
  const document = await applicationDocumentModel.findOne(applicationId, documentId)
  if (!document) throw new AppError(404, 'Document not found.')
  return {
    storedName: document.stored_name,
    mimeType: document.mime_type,
    // A server-made name, so nothing from the upload ends up in a response header
    downloadName: `application-${applicationId}-receipt${path.extname(document.stored_name)}`,
  }
}
