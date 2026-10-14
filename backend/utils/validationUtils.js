import { EXAM_RESULTS } from '../config/licenceExam.js'
import { PAYMENT_METHODS, findPackageById } from '../config/packages.js'
import AppError from './AppError.js'
import { addDays, getSchoolDate, isTuesday, isValidDate } from './dateUtils.js'

export const ROLES = ['admin', 'student', 'instructor']
// Roles an admin may issue an ID for directly. Student IDs are issued only by approving
// a registration application; admin accounts are created by the seeder only.
export const PROVISIONABLE_ROLES = ['instructor']

export const APPLICATION_STATUSES = ['NEW', 'APPROVED', 'SUSPENDED', 'REJECTED']
export const APPLICATION_TYPES = ['NEW_STUDENT', 'REAPPLICATION']

export const EXAM_DATE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED']
export const MAX_PREFERRED_DATES = 3
// How far ahead a preferred date may be
const PREFERRED_DATE_HORIZON_DAYS = 365
export const MEDICAL_REPORT_REQUIRED_MESSAGE =
  'Please submit your medical report before requesting a driving licence examination date.'
// Reasons an admin may give for rejecting an exam date request. OTHER needs the admin's own text.
export const REJECTION_REASONS = {
  MEDICAL_REPORT_NOT_SUBMITTED: 'Medical report not submitted',
  NO_SLOTS_AVAILABLE: 'No examination slots available',
  OTHER: 'Other',
}
const OTHER_REASON_MAX_LENGTH = 300
const NOTIFICATION_LIMIT_DEFAULT = 20
const NOTIFICATION_LIMIT_MAX = 100

// Accounts an admin manages on the Manage Users page. Admin accounts are never listed there.
export const MANAGED_ROLES = ['student', 'instructor']
export const ACCOUNT_STATUSES = ['active', 'inactive']
const USER_PAGE_SIZE_DEFAULT = 10
const USER_PAGE_SIZE_MAX = 100
const SEARCH_MAX_LENGTH = 100

export const PASSWORD_MIN_LENGTH = 8
// bcrypt ignores everything after 72 bytes
const PASSWORD_MAX_BYTES = 72

const MOBILE_PATTERN = /^[0-9]{10}$/
const NIC_PATTERN = /^([0-9]{9}V|[0-9]{12})$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DRIVING_SCHOOL_ID_PATTERN = /^[A-Za-z0-9_-]{3,50}$/

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '')
const asString = (value) => (typeof value === 'string' ? value : '')

export const isValidEmail = (email) => email.length <= 150 && EMAIL_PATTERN.test(email)

export const getPasswordError = (password) => {
  if (!password) return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'Password is too long.'
  return ''
}

const throwIfInvalid = (errors) => {
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Please correct the highlighted fields.', errors)
  }
}

// Each validator reads only the fields it expects from the request body and returns clean
// values. Anything else the client sends (for example "role") is ignored.

export const validateRegistrationInput = (body = {}) => {
  const input = {
    drivingSchoolId: asTrimmedString(body.drivingSchoolId),
    name: asTrimmedString(body.name),
    email: asTrimmedString(body.email).toLowerCase(),
    password: asString(body.password),
  }
  const confirmPassword = asString(body.confirmPassword)
  const errors = {}

  if (!input.drivingSchoolId) errors.drivingSchoolId = 'Driving School ID is required.'
  else if (!DRIVING_SCHOOL_ID_PATTERN.test(input.drivingSchoolId)) {
    errors.drivingSchoolId = 'Driving School ID is not valid.'
  }
  if (!input.name) errors.name = 'Name is required.'
  else if (input.name.length > 100) errors.name = 'Name must be 100 characters or fewer.'
  if (!input.email) errors.email = 'E-mail address is required.'
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.'
  const passwordError = getPasswordError(input.password)
  if (passwordError) errors.password = passwordError
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.'

  throwIfInvalid(errors)
  return input
}

// Admin creating an instructor account. Only these fields are read: a role, Driving School
// ID, status or password hash sent by the client is ignored.
export const validateInstructorInput = (body = {}) => {
  const input = {
    name: asTrimmedString(body.name),
    email: asTrimmedString(body.email).toLowerCase(),
    password: asString(body.password),
  }
  const confirmPassword = asString(body.confirmPassword)
  const errors = {}

  if (!input.name) errors.name = 'Full name is required.'
  else if (input.name.length > 100) errors.name = 'Full name must be 100 characters or fewer.'
  if (!input.email) errors.email = 'E-mail address is required.'
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.'
  const passwordError = getPasswordError(input.password)
  if (passwordError) errors.password = passwordError
  if (!confirmPassword) errors.confirmPassword = 'Please confirm the password.'
  else if (confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.'

  throwIfInvalid(errors)
  return input
}

// Query string of the admin user list: ?role=&status=&search=&page=&pageSize=
// Unknown or empty filters mean "all"; invalid values are rejected.
export const validateUserListQuery = (query = {}) => {
  const role = asTrimmedString(query.role).toLowerCase()
  const status = asTrimmedString(query.status).toLowerCase()
  const search = asTrimmedString(query.search).slice(0, SEARCH_MAX_LENGTH)
  const page = query.page === undefined || query.page === '' ? 1 : Number(query.page)
  const pageSize =
    query.pageSize === undefined || query.pageSize === ''
      ? USER_PAGE_SIZE_DEFAULT
      : Number(query.pageSize)

  if (role && !MANAGED_ROLES.includes(role)) {
    throw new AppError(400, `Role must be one of: ${MANAGED_ROLES.join(', ')}.`)
  }
  if (status && !ACCOUNT_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${ACCOUNT_STATUSES.join(', ')}.`)
  }
  if (!Number.isInteger(page) || page < 1) throw new AppError(400, 'Page must be 1 or more.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > USER_PAGE_SIZE_MAX) {
    throw new AppError(400, `Page size must be between 1 and ${USER_PAGE_SIZE_MAX}.`)
  }
  return { role: role || undefined, status: status || undefined, search, page, pageSize }
}

export const validateLoginInput = (body = {}) => {
  const input = {
    drivingSchoolId: asTrimmedString(body.drivingSchoolId),
    password: asString(body.password),
    keepSignedIn: body.keepSignedIn === true,
  }
  const errors = {}
  if (!input.drivingSchoolId) errors.drivingSchoolId = 'Driving School ID is required.'
  if (!input.password) errors.password = 'Password is required.'

  throwIfInvalid(errors)
  return input
}

export const validateProvisionInput = (body = {}) => {
  const role = asTrimmedString(body.role).toLowerCase()
  if (!PROVISIONABLE_ROLES.includes(role)) {
    throw new AppError(400, 'Please correct the highlighted fields.', {
      role: `Role must be one of: ${PROVISIONABLE_ROLES.join(', ')}.`,
    })
  }
  return { role }
}

// The Apply Now form. Only these fields are read: a status, price or Driving School ID
// sent by the client is ignored.
export const validateApplicationInput = (body = {}) => {
  const input = {
    fullName: asTrimmedString(body.fullName),
    mobileNumber: asTrimmedString(body.mobile),
    email: asTrimmedString(body.email).toLowerCase() || null,
    nic: asTrimmedString(body.nic).toUpperCase(),
    address: asTrimmedString(body.address),
    packageId: Number(asTrimmedString(body.packageId)),
    paymentMethod: asTrimmedString(body.paymentMethod),
  }
  const errors = {}

  if (!input.fullName) errors.fullName = 'Full name is required.'
  else if (input.fullName.length > 100) errors.fullName = 'Full name must be 100 characters or fewer.'
  if (!MOBILE_PATTERN.test(input.mobileNumber)) {
    errors.mobile = 'Mobile number must contain exactly 10 digits.'
  }
  if (input.email && !isValidEmail(input.email)) errors.email = 'Enter a valid email address.'
  if (!NIC_PATTERN.test(input.nic)) errors.nic = 'Enter a valid NIC: 9 digits + V or 12 digits.'
  if (!input.address) errors.address = 'Address is required.'
  else if (input.address.length > 500) errors.address = 'Address must be 500 characters or fewer.'
  if (!findPackageById(input.packageId)) errors.packageId = 'Please select a package to continue.'
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    errors.paymentMethod = 'Please select a payment method.'
  }

  throwIfInvalid(errors)
  return input
}

// Optional ?status= filter for the admin list. Returns undefined when no filter is given.
export const validateApplicationStatusFilter = (value) => {
  if (value === undefined || value === '') return undefined
  const status = asTrimmedString(value).toUpperCase()
  if (!APPLICATION_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${APPLICATION_STATUSES.join(', ')}.`)
  }
  return status
}

// A request for a physical exam date. Only these two fields are read: a student id, name,
// status or approved date sent by the client is ignored. The dates must be one to three
// different Tuesdays after today's date in Sri Lanka; they are returned in the order sent.
export const validateExamDateRequestInput = (body = {}, now = new Date()) => {
  // Only a real `true` counts: the student has to confirm it, nothing is assumed
  if (body.medicalReportSubmitted !== true) {
    throw new AppError(400, MEDICAL_REPORT_REQUIRED_MESSAGE, {
      medicalReportSubmitted: MEDICAL_REPORT_REQUIRED_MESSAGE,
    })
  }

  const dates = body.preferredDates
  const today = getSchoolDate(now)
  let error = ''
  if (!Array.isArray(dates) || dates.length === 0) {
    error = 'Select at least one Tuesday.'
  } else if (dates.length > MAX_PREFERRED_DATES) {
    error = `You can select up to ${MAX_PREFERRED_DATES} dates.`
  } else if (!dates.every(isValidDate)) {
    error = 'One of the selected dates is not a valid date.'
  } else if (new Set(dates).size !== dates.length) {
    error = 'Select different dates: the same date was selected twice.'
  } else if (!dates.every(isTuesday)) {
    error = 'Only Tuesdays can be selected.'
  } else if (dates.some((date) => date <= today)) {
    error = 'Only future dates can be selected. Today and past dates are not available.'
  } else if (dates.some((date) => date > addDays(today, PREFERRED_DATE_HORIZON_DAYS))) {
    error = 'Select dates within the next 12 months.'
  }
  if (error) throw new AppError(400, error, { preferredDates: error })

  return { medicalReportSubmitted: true, preferredDates: [...dates] }
}

// Optional ?status= filter for the admin list. Returns undefined when no filter is given.
export const validateExamDateRequestStatusFilter = (value) => {
  if (value === undefined || value === '') return undefined
  const status = asTrimmedString(value).toUpperCase()
  if (!EXAM_DATE_REQUEST_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${EXAM_DATE_REQUEST_STATUSES.join(', ')}.`)
  }
  return status
}

// Admin approving a request: exactly one date. Whether it is one of the student's
// preferred dates is checked against the stored request in the service.
export const validateExamDateApprovalInput = (body = {}) => {
  const approvedDate = asTrimmedString(body.approvedDate)
  if (!isValidDate(approvedDate)) {
    const message = 'Choose one of the dates the student requested.'
    throw new AppError(400, message, { approvedDate: message })
  }
  return { approvedDate }
}

// Admin rejecting a request: one of the listed reasons, with the admin's own text for OTHER
export const validateExamDateRejectionInput = (body = {}) => {
  const reasonCode = asTrimmedString(body.reason).toUpperCase()
  const otherReason = asTrimmedString(body.otherReason)
  const errors = {}

  if (!Object.hasOwn(REJECTION_REASONS, reasonCode)) {
    errors.reason = 'Please choose a reason for the rejection.'
  } else if (reasonCode === 'OTHER') {
    if (!otherReason) errors.otherReason = 'Please enter the reason for the rejection.'
    else if (otherReason.length > OTHER_REASON_MAX_LENGTH) {
      errors.otherReason = `The reason must be ${OTHER_REASON_MAX_LENGTH} characters or fewer.`
    }
  }

  throwIfInvalid(errors)
  return { reasonCode, otherReason: reasonCode === 'OTHER' ? otherReason : null }
}

// Admin recording the result of an examination: exactly PASSED or FAILED
export const validateExamResultInput = (body = {}) => {
  const result = asTrimmedString(body.result).toUpperCase()
  if (!EXAM_RESULTS.includes(result)) {
    const message = 'Please select Passed or Failed.'
    throw new AppError(400, message, { result: message })
  }
  return { result }
}

// A reattempt payment. Only the payment method is read from the form: the fee, the failed
// attempt it pays for, the statuses and the student come from the server. The files are
// checked by the upload middleware and the service.
export const validateReattemptRequestInput = (body = {}) => {
  const paymentMethod = asTrimmedString(body.paymentMethod)
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    const message = 'Please select a payment method.'
    throw new AppError(400, message, { paymentMethod: message })
  }
  return { paymentMethod }
}

// Admin rejecting a reattempt payment or a reapplication: the reason the student will see
export const validateRejectionReasonInput = (body = {}) => {
  const reason = asTrimmedString(body.reason)
  const errors = {}
  if (!reason) errors.reason = 'Please enter the reason for the rejection.'
  else if (reason.length > OTHER_REASON_MAX_LENGTH) {
    errors.reason = `The reason must be ${OTHER_REASON_MAX_LENGTH} characters or fewer.`
  }
  throwIfInvalid(errors)
  return { reason }
}

// The Driving School ID and password of a locked student who is reapplying. Checked
// against the account by the service; here only that both were sent.
export const validateReapplicationCredentials = (body = {}) => {
  const credentials = {
    drivingSchoolId: asTrimmedString(body.drivingSchoolId),
    password: asString(body.password),
  }
  const errors = {}
  if (!credentials.drivingSchoolId) errors.drivingSchoolId = 'Driving School ID is required.'
  if (!credentials.password) errors.password = 'Password is required.'
  throwIfInvalid(errors)
  return credentials
}

export const MEDICAL_REPORT_NOT_OBTAINED_MESSAGE =
  'Please obtain a new medical report before continuing with your reapplication.'

// The reapplication form: the same fields as the Apply Now form (details, package and
// payment method), plus the student's answer to "Have you obtained a new medical report?",
// which must be an explicit 'yes'. A user id, status, price, fee or account status sent by
// the client is ignored. The receipt is checked by the upload middleware and the service.
export const validateReapplicationInput = (body = {}) => {
  const answer = asTrimmedString(body.newMedicalReportConfirmed).toLowerCase()
  let medicalError = ''
  if (answer === 'no') medicalError = MEDICAL_REPORT_NOT_OBTAINED_MESSAGE
  else if (answer !== 'yes') medicalError = 'Please answer whether you have obtained a new medical report.'

  let input
  try {
    input = validateApplicationInput(body)
  } catch (error) {
    if (medicalError && error instanceof AppError) {
      error.errors = { ...error.errors, newMedicalReportConfirmed: medicalError }
    }
    throw error
  }
  if (medicalError) throw new AppError(400, medicalError, { newMedicalReportConfirmed: medicalError })
  return { ...input, newMedicalReportConfirmed: true }
}

// Optional ?type= filter for the admin list of applications
export const validateApplicationTypeFilter = (value) => {
  if (value === undefined || value === '') return undefined
  const type = asTrimmedString(value).toUpperCase()
  if (!APPLICATION_TYPES.includes(type)) {
    throw new AppError(400, `Type must be one of: ${APPLICATION_TYPES.join(', ')}.`)
  }
  return type
}

// Query string of the notification list: ?limit=
export const validateNotificationListQuery = (query = {}) => {
  const limit =
    query.limit === undefined || query.limit === '' ? NOTIFICATION_LIMIT_DEFAULT : Number(query.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > NOTIFICATION_LIMIT_MAX) {
    throw new AppError(400, `Limit must be between 1 and ${NOTIFICATION_LIMIT_MAX}.`)
  }
  return { limit }
}

// An answer to an exam question. Only the option id is read: a score, correct answer,
// time or status sent by the client is ignored.
export const validateAnswerInput = (body = {}) => {
  const optionId = asTrimmedString(body.optionId)
  if (!optionId || optionId.length > 60) {
    throw new AppError(400, 'Please choose one of the answer options.')
  }
  return { optionId }
}

// Route ids (/:id). Anything that is not a positive whole number cannot match a record.
export const parseId = (value) => {
  if (!/^[1-9][0-9]{0,9}$/.test(String(value))) throw new AppError(404, 'Record not found.')
  return Number(value)
}
