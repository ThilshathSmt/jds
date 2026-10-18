// Business rules for the school's packages and settings: the "Packages & Exam Penalties"
// admin page, and what the registration forms and the examination rules read from it.
//
//   Packages: name, price (whole LKR) and whether they are offered. Never deleted, only
//   deactivated, and at least one stays active so a student can always register.
//   Settings: the minimum registration advance payment (% of the package price) and the
//   examination reattempt fee (LKR).
//
// The database is the only source of these values. Whatever uses one copies it at that
// moment (an application keeps its package name, price and minimum payment; a failed
// attempt keeps its fee), so a change here only applies to what comes after it.

import pool, { withTransaction } from '../config/database.js'
import { examWeekdaysToMask, maskToExamWeekdays } from '../config/licenceExam.js'
import { FULL_PAYMENT_THRESHOLD, getMinimumPayment } from '../config/packages.js'
import * as settingsModel from '../models/settingsModel.js'
import AppError from '../utils/AppError.js'

export const SETTING_KEYS = {
  advancePaymentPercent: 'registration_advance_payment_percent',
  reattemptFee: 'exam_reattempt_fee',
  practicalReattemptFee: 'practical_reattempt_fee',
}

const PACKAGE_NOT_FOUND = 'Package not found.'
const DUPLICATE_NAME = 'Another package already has this name.'
// Sent when the amount the student was shown is no longer what the server would charge
export const TERMS_CHANGED_CODE = 'REGISTRATION_TERMS_CHANGED'

const toPackage = (row) => ({
  id: row.id,
  name: row.name,
  price: row.price,
  isActive: row.is_active === 1,
  updatedAt: row.updated_at,
})

// The current settings. Missing rows mean the database has not been set up.
export const getSettings = async (db = pool) => {
  const rows = await settingsModel.findSettings(db)
  const settings = {}
  for (const [name, key] of Object.entries(SETTING_KEYS)) {
    if (!rows[key]) throw new AppError(500, 'School settings are missing. Please run the database setup.')
    settings[name] = rows[key].value
  }
  return settings
}

// ---- Public: what the Apply Now and reapplication forms need

export const getRegistrationOptions = async () => {
  const [packages, { advancePaymentPercent }] = await Promise.all([
    settingsModel.findActivePackages(),
    getSettings(),
  ])
  return {
    packages: packages.map(({ id, name, price }) => ({ id, name, price })),
    advancePaymentPercent,
    fullPaymentThreshold: FULL_PAYMENT_THRESHOLD,
  }
}

// What a new application for `packageId` must record, worked out from the database now:
// the package's name and price and the minimum registration payment. `db` should be the
// transaction saving the application; the package row is share-locked so it cannot change
// before the application is saved.
// `quotedMinimumPayment` is the amount the form showed the student (optional). It is never
// used as the amount: when it differs from the server's, the student is asked to review
// the new terms instead of being charged something they were not shown.
export const quoteRegistration = async (packageId, quotedMinimumPayment, db) => {
  const row = await settingsModel.findPackageById(packageId, db, { lock: 'share' })
  if (!row || row.is_active !== 1) {
    const message = 'This package is no longer available. Please choose another package.'
    throw new AppError(400, message, { packageId: message })
  }
  const { advancePaymentPercent } = await getSettings(db)
  const minimumPayment = getMinimumPayment(row.price, advancePaymentPercent)
  if (quotedMinimumPayment !== null && quotedMinimumPayment !== minimumPayment) {
    throw new AppError(
      409,
      'The package price or the registration payment rule has just changed. Please review the updated amount before submitting.',
      undefined,
      TERMS_CHANGED_CODE,
    )
  }
  return { packageId: row.id, packageName: row.name, packagePrice: row.price, minimumPayment }
}

// ---- Admin

export const getAdminSettings = async () => {
  const [packages, rows] = await Promise.all([settingsModel.findAllPackages(), settingsModel.findSettings()])
  const settings = await getSettings()
  return {
    packages: packages.map(toPackage),
    advancePaymentPercent: settings.advancePaymentPercent,
    reattemptFee: settings.reattemptFee,
    practicalReattemptFee: settings.practicalReattemptFee,
    fullPaymentThreshold: FULL_PAYMENT_THRESHOLD,
    settingsUpdatedAt: {
      advancePaymentPercent: rows[SETTING_KEYS.advancePaymentPercent]?.updatedAt ?? null,
      reattemptFee: rows[SETTING_KEYS.reattemptFee]?.updatedAt ?? null,
      practicalReattemptFee: rows[SETTING_KEYS.practicalReattemptFee]?.updatedAt ?? null,
    },
  }
}

const duplicateName = () => new AppError(409, DUPLICATE_NAME, { name: DUPLICATE_NAME })

// `input` is { name, price, isActive }, already validated
export const createPackage = async (input, adminId) => {
  try {
    const id = await withTransaction(async (db) => {
      if (await settingsModel.findPackageByName(input.name, db)) throw duplicateName()
      return settingsModel.createPackage({ ...input, updatedBy: adminId }, db)
    })
    return toPackage(await settingsModel.findPackageById(id))
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateName()
    throw error
  }
}

// Changes only the package: applications that chose it keep the name and price they were
// submitted with
export const updatePackage = async (id, input, adminId) => {
  try {
    await withTransaction(async (db) => {
      const existing = await settingsModel.findPackageById(id, db, { lock: 'update' })
      if (!existing) throw new AppError(404, PACKAGE_NOT_FOUND)
      const sameName = await settingsModel.findPackageByName(input.name, db)
      if (sameName && sameName.id !== id) throw duplicateName()
      if (existing.is_active === 1 && !input.isActive && (await settingsModel.countActivePackages(db)) <= 1) {
        throw new AppError(409, 'At least one package must stay active so that students can register.')
      }
      await settingsModel.updatePackage(id, { ...input, updatedBy: adminId }, db)
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw duplicateName()
    throw error
  }
  return toPackage(await settingsModel.findPackageById(id))
}

// `input` has any of { advancePaymentPercent, reattemptFee }, already validated. Saved
// together: either every given setting changes or none does.
export const updateSettings = async (input, adminId) => {
  await withTransaction(async (db) => {
    await settingsModel.findSettings(db, { forUpdate: true })
    for (const [name, key] of Object.entries(SETTING_KEYS)) {
      if (input[name] !== undefined) await settingsModel.saveSetting(key, input[name], adminId, db)
    }
  })
  return getAdminSettings()
}

// ---- Driving Exam: the weekdays students may choose for the physical examination

export const EXAM_WEEKDAYS_KEY = 'exam_allowed_weekdays'

// { weekdays: [1-5, ascending], updatedAt }. A missing row (database set up before the
// setting existed and not set up again) means the default, Tuesdays only.
// `lock: 'share'` makes a simultaneous admin change wait until the caller's transaction ends.
export const getExamWeekdays = async (db = pool, { lock } = {}) => {
  const row = await settingsModel.findSetting(EXAM_WEEKDAYS_KEY, db, { lock })
  return { weekdays: maskToExamWeekdays(row?.value ?? 0), updatedAt: row?.updatedAt ?? null }
}

// `weekdays` is already validated (1-5 different days from Monday to Friday). One row,
// inserted the first time and updated after that. Applies to requests submitted from now
// on: saved requests and approved dates are never changed by it.
export const updateExamWeekdays = async (weekdays, adminId) => {
  await withTransaction(async (db) => {
    await settingsModel.saveSetting(EXAM_WEEKDAYS_KEY, examWeekdaysToMask(weekdays), adminId, db)
  })
  return getExamWeekdays()
}
