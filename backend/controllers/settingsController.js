// HTTP handling for packages and school settings. Rules live in services/settingsService.js.

import * as settingsService from '../services/settingsService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateExamWeekdaysInput,
  validatePackageInput,
  validateSettingsInput,
} from '../utils/validationUtils.js'

// Public: GET /api/registration-applications/options
// The active packages and the advance payment rule, for the Apply Now and reapplication forms
export const getRegistrationOptions = async (req, res) => {
  const options = await settingsService.getRegistrationOptions()
  sendSuccess(res, { message: 'Registration options', data: options })
}

// Admin: GET /api/admin/settings
export const getAdminSettings = async (req, res) => {
  const settings = await settingsService.getAdminSettings()
  sendSuccess(res, { message: 'Packages and settings', data: settings })
}

// Admin: PUT /api/admin/settings { advancePaymentPercent?, reattemptFee? }
export const updateSettings = async (req, res) => {
  const settings = await settingsService.updateSettings(validateSettingsInput(req.body), req.user.id)
  sendSuccess(res, { message: 'Settings saved. They apply to new applications and newly recorded failed attempts.', data: settings })
}

// Admin: POST /api/admin/packages { name, price, isActive? }
export const createPackage = async (req, res) => {
  const created = await settingsService.createPackage(validatePackageInput(req.body), req.user.id)
  sendSuccess(res, { statusCode: 201, message: 'Package added.', data: { package: created } })
}

// Admin: PUT /api/admin/packages/:id { name, price, isActive }
export const updatePackage = async (req, res) => {
  const updated = await settingsService.updatePackage(
    parseId(req.params.id),
    validatePackageInput(req.body),
    req.user.id,
  )
  sendSuccess(res, { message: 'Package saved. Existing applications keep the price they were submitted with.', data: { package: updated } })
}

// Admin: GET /api/admin/exam-weekdays
// The days of the week students may choose for the physical driving licence examination
export const getExamWeekdays = async (req, res) => {
  const data = await settingsService.getExamWeekdays()
  sendSuccess(res, { message: 'Driving exam days', data })
}

// Admin: PUT /api/admin/exam-weekdays { weekdays: [1-5] }
export const updateExamWeekdays = async (req, res) => {
  const { weekdays } = validateExamWeekdaysInput(req.body)
  const data = await settingsService.updateExamWeekdays(weekdays, req.user.id)
  sendSuccess(res, {
    message: 'Driving exam days saved. They apply to new exam date requests; existing requests and approved dates are not changed.',
    data,
  })
}
