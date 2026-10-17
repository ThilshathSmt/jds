import { EXAM_RESULTS } from '../config/licenceExam.js'
import { isLessonTimeSlot } from '../config/practical.js'
import { PAYMENT_METHODS } from '../config/packages.js'
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

// What an instructor can be responsible for (users.responsibility). The labels are what the
// admin pages show; keep them in step with frontend/src/data/instructorData.js.
export const INSTRUCTOR_RESPONSIBILITIES = {
  VAN: 'Van',
  MOTOR_BIKE: 'Motor Bike',
  THREE_WHEELER: 'Three Wheeler',
  BUS: 'Bus',
  TRACTOR: 'Tractor',
}
const RESPONSIBILITY_REQUIRED = 'Please select what the instructor is responsible for.'
const getResponsibilityError = (value) =>
  Object.hasOwn(INSTRUCTOR_RESPONSIBILITIES, value) ? '' : RESPONSIBILITY_REQUIRED

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

// The Driving School ID typed on the account registration page
const getDrivingSchoolIdError = (drivingSchoolId) => {
  if (!drivingSchoolId) return 'Driving School ID is required.'
  if (!DRIVING_SCHOOL_ID_PATTERN.test(drivingSchoolId)) return 'Driving School ID is not valid.'
  return ''
}

// "Verify ID" on the account registration page
export const validateDrivingSchoolIdInput = (body = {}) => {
  const drivingSchoolId = asTrimmedString(body.drivingSchoolId)
  const error = getDrivingSchoolIdError(drivingSchoolId)
  if (error) throw new AppError(400, error, { drivingSchoolId: error })
  return { drivingSchoolId }
}

// Account registration: only the Driving School ID and the password are read. The name and
// e-mail come from the approved application on the server; any sent by the client are
// ignored.
export const validateRegistrationInput = (body = {}) => {
  const input = {
    drivingSchoolId: asTrimmedString(body.drivingSchoolId),
    password: asString(body.password),
  }
  const confirmPassword = asString(body.confirmPassword)
  const errors = {}

  const idError = getDrivingSchoolIdError(input.drivingSchoolId)
  if (idError) errors.drivingSchoolId = idError
  const passwordError = getPasswordError(input.password)
  if (passwordError) errors.password = passwordError
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (confirmPassword !== input.password) errors.confirmPassword = 'Passwords do not match.'

  throwIfInvalid(errors)
  return input
}

// Admin changing an instructor's responsibility: only this field is read
export const validateResponsibilityInput = (body = {}) => {
  const responsibility = asTrimmedString(body.responsibility).toUpperCase()
  const error = getResponsibilityError(responsibility)
  if (error) throw new AppError(400, error, { responsibility: error })
  return { responsibility }
}

// Admin creating an instructor account. Only these fields are read: a role, Driving School
// ID, status or password hash sent by the client is ignored.
export const validateInstructorInput = (body = {}) => {
  const input = {
    name: asTrimmedString(body.name),
    email: asTrimmedString(body.email).toLowerCase(),
    password: asString(body.password),
    responsibility: asTrimmedString(body.responsibility).toUpperCase(),
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
  const responsibilityError = getResponsibilityError(input.responsibility)
  if (responsibilityError) errors.responsibility = responsibilityError

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

// A whole number from a JSON number or a form field string; NaN when it is not one
const asWholeNumber = (value) => {
  const text = typeof value === 'number' ? String(value) : asTrimmedString(value)
  return /^\d+$/.test(text) ? Number(text) : Number.NaN
}

// The Apply Now form. Only these fields are read: a status, price or Driving School ID
// sent by the client is ignored. Whether the package exists and is offered is checked
// against the database by the service. `quotedMinimumPayment` (optional) is the amount the
// form showed: it is only compared with the server's own amount, never used as it.
export const validateApplicationInput = (body = {}) => {
  // A JSON number or a form field string; empty or missing means no quote was sent
  const quoted = typeof body.quotedMinimumPayment === 'number' ? body.quotedMinimumPayment : asTrimmedString(body.quotedMinimumPayment)
  const input = {
    fullName: asTrimmedString(body.fullName),
    mobileNumber: asTrimmedString(body.mobile),
    email: asTrimmedString(body.email).toLowerCase() || null,
    nic: asTrimmedString(body.nic).toUpperCase(),
    address: asTrimmedString(body.address),
    packageId: asWholeNumber(body.packageId),
    paymentMethod: asTrimmedString(body.paymentMethod),
    quotedMinimumPayment: quoted === '' ? null : asWholeNumber(quoted),
  }
  const errors = {}

  if (!input.fullName) errors.fullName = 'Full name is required.'
  else if (input.fullName.length > 100) errors.fullName = 'Full name must be 100 characters or fewer.'
  if (!MOBILE_PATTERN.test(input.mobileNumber)) {
    errors.mobile = 'Mobile number must contain exactly 10 digits.'
  }
  if (!input.email) errors.email = 'Email address is required.'
  else if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.'
  else if (input.email.length > 150) errors.email = 'Email address must be 150 characters or fewer.'
  if (!NIC_PATTERN.test(input.nic)) errors.nic = 'Enter a valid NIC: 9 digits + V or 12 digits.'
  if (!input.address) errors.address = 'Address is required.'
  else if (input.address.length > 500) errors.address = 'Address must be 500 characters or fewer.'
  if (!Number.isSafeInteger(input.packageId) || input.packageId < 1) {
    errors.packageId = 'Please select a package to continue.'
  }
  if (Number.isNaN(input.quotedMinimumPayment)) input.quotedMinimumPayment = null
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

// ---- Packages & Exam Penalties (admin)

const PACKAGE_NAME_MAX_LENGTH = 150
// Whole rupees; the upper limits only catch typing mistakes
const PACKAGE_PRICE_MAX = 10_000_000
const REATTEMPT_FEE_MAX = 1_000_000

// A package being created or edited: { name, price, isActive }
export const validatePackageInput = (body = {}) => {
  const input = {
    name: asTrimmedString(body.name).replace(/\s+/g, ' '),
    price: asWholeNumber(body.price),
    isActive: body.isActive === undefined ? true : body.isActive,
  }
  const errors = {}
  if (!input.name) errors.name = 'Package name is required.'
  else if (input.name.length > PACKAGE_NAME_MAX_LENGTH) {
    errors.name = `Package name must be ${PACKAGE_NAME_MAX_LENGTH} characters or fewer.`
  }
  if (!Number.isSafeInteger(input.price) || input.price < 1 || input.price > PACKAGE_PRICE_MAX) {
    errors.price = `Enter a price in whole rupees between 1 and ${PACKAGE_PRICE_MAX.toLocaleString('en-US')}.`
  }
  if (typeof input.isActive !== 'boolean') errors.isActive = 'Active must be true or false.'
  throwIfInvalid(errors)
  return input
}

// The settings being changed: any of { advancePaymentPercent, reattemptFee,
// practicalReattemptFee }
export const validateSettingsInput = (body = {}) => {
  const input = {}
  const errors = {}
  if (body.advancePaymentPercent !== undefined) {
    input.advancePaymentPercent = asWholeNumber(body.advancePaymentPercent)
    if (!(input.advancePaymentPercent >= 1 && input.advancePaymentPercent <= 100)) {
      errors.advancePaymentPercent = 'Enter a whole percentage from 1 to 100.'
    }
  }
  for (const name of ['reattemptFee', 'practicalReattemptFee']) {
    if (body[name] === undefined) continue
    input[name] = asWholeNumber(body[name])
    if (!(input[name] >= 1 && input[name] <= REATTEMPT_FEE_MAX)) {
      errors[name] = `Enter a fee in whole rupees between 1 and ${REATTEMPT_FEE_MAX.toLocaleString('en-US')}.`
    }
  }
  if (Object.keys(input).length === 0) throw new AppError(400, 'Nothing to update.')
  throwIfInvalid(errors)
  return input
}

// ---- Practical training and the practical driving test

const PRACTICAL_CYCLE_STATUSES = ['ACTIVE', 'PASSED', 'EXHAUSTED']
const LOCATION_MAX_LENGTH = 150
const REMARKS_MAX_LENGTH = 500
const FEEDBACK_TEXT_MAX_LENGTH = 2000
const asPositiveId = (value) => {
  const number = asWholeNumber(value)
  return Number.isSafeInteger(number) && number >= 1 ? number : null
}

// Optional ?status= filter of the admin Lessons list
export const validatePracticalStatusFilter = (value) => {
  if (value === undefined || value === '') return undefined
  const status = asTrimmedString(value).toUpperCase()
  if (!PRACTICAL_CYCLE_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${PRACTICAL_CYCLE_STATUSES.join(', ')}.`)
  }
  return status
}

// The instructors assigned to a student: a list of distinct user ids (the service checks
// the limit of four and that they are active instructors)
export const validateInstructorIdsInput = (body = {}) => {
  const list = Array.isArray(body.instructorIds) ? body.instructorIds : null
  const ids = list?.map(asPositiveId)
  if (!ids || ids.some((id) => id === null) || new Set(ids).size !== ids.length) {
    const message = 'Choose each instructor once.'
    throw new AppError(400, message, { instructorIds: message })
  }
  return { instructorIds: ids }
}

// One lesson's schedule: date, time and instructor required, location optional. The time
// must be one of the 15-minute slots from 07:00 to 19:00; whether the date is allowed for
// the student is checked by the service.
export const validateLessonInput = (body = {}) => {
  const input = {
    instructorId: asPositiveId(body.instructorId),
    date: asTrimmedString(body.date),
    time: asTrimmedString(body.time) || null,
    location: asTrimmedString(body.location) || null,
  }
  const errors = {}
  if (!input.instructorId) errors.instructorId = 'Choose the instructor for this lesson.'
  if (!isValidDate(input.date)) errors.date = 'Choose a valid lesson date.'
  if (!input.time) errors.time = 'Choose the lesson time.'
  else if (!isLessonTimeSlot(input.time)) {
    errors.time = 'Choose a time between 7:00 AM and 7:00 PM in 15-minute steps (for example 7:15 AM).'
  }
  if (input.location && input.location.length > LOCATION_MAX_LENGTH) {
    errors.location = `Location must be ${LOCATION_MAX_LENGTH} characters or fewer.`
  }
  throwIfInvalid(errors)
  return input
}

// The admin's practical test date decision: keep the provisional date, or a chosen date
export const validateTestScheduleInput = (body = {}) => {
  if (body.keepProvisional === true) return { keepProvisional: true, testDate: null }
  const testDate = asTrimmedString(body.testDate)
  if (!isValidDate(testDate)) {
    const message = 'Choose a valid practical test date.'
    throw new AppError(400, message, { testDate: message })
  }
  return { keepProvisional: false, testDate }
}

export const validatePracticalResultInput = (body = {}) => {
  const result = asTrimmedString(body.result).toUpperCase()
  const remarks = asTrimmedString(body.remarks) || null
  const errors = {}
  if (!EXAM_RESULTS.includes(result)) errors.result = 'Please select Passed or Failed.'
  if (remarks && remarks.length > REMARKS_MAX_LENGTH) errors.remarks = `Remarks must be ${REMARKS_MAX_LENGTH} characters or fewer.`
  throwIfInvalid(errors)
  return { result, remarks }
}

export const validateAttendanceInput = (body = {}) => {
  const attendance = asTrimmedString(body.attendance).toUpperCase()
  if (!['ATTENDED', 'ABSENT'].includes(attendance)) {
    const message = 'Mark the student as Attended or Absent.'
    throw new AppError(400, message, { attendance: message })
  }
  return { attendance }
}

const SAFETY_RATING_VALUES = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
const RECOMMENDATION_VALUES = ['READY_FOR_TEST', 'NEEDS_MORE_PRACTICE']

// An instructor's feedback. Completeness for submitting is checked by the service; here
// only the shape and limits. `submit` must be a real true to submit.
export const validateFeedbackInput = (body = {}) => {
  const text = (name) => asTrimmedString(body[name]) || null
  const input = {
    cycleId: asPositiveId(body.cycleId),
    lessonIds: Array.isArray(body.lessonIds) ? body.lessonIds.map(asPositiveId) : [],
    drivingSkills: text('drivingSkills'),
    strengths: text('strengths'),
    improvements: text('improvements'),
    safetyAwareness: asTrimmedString(body.safetyAwareness).toUpperCase() || null,
    comments: text('comments'),
    recommendation: asTrimmedString(body.recommendation).toUpperCase() || null,
    submit: body.submit === true,
  }
  const errors = {}
  if (!input.cycleId) errors.cycleId = 'Choose the student.'
  if (input.lessonIds.some((id) => id === null) || new Set(input.lessonIds).size !== input.lessonIds.length) {
    errors.lessonIds = 'Choose each lesson once.'
  }
  for (const name of ['drivingSkills', 'strengths', 'improvements', 'comments']) {
    if (input[name] && input[name].length > FEEDBACK_TEXT_MAX_LENGTH) {
      errors[name] = `At most ${FEEDBACK_TEXT_MAX_LENGTH} characters.`
    }
  }
  if (input.safetyAwareness && !SAFETY_RATING_VALUES.includes(input.safetyAwareness)) {
    errors.safetyAwareness = 'Choose a safety awareness rating.'
  }
  if (input.recommendation && !RECOMMENDATION_VALUES.includes(input.recommendation)) {
    errors.recommendation = 'Choose a recommendation.'
  }
  throwIfInvalid(errors)
  return input
}

// Filters of the admin Feedbacks page: ?search=&instructorId=&from=&to=&cycleId=
export const validateFeedbackFilters = (query = {}) => {
  const filters = {
    search: asTrimmedString(query.search).slice(0, SEARCH_MAX_LENGTH) || undefined,
    instructorId: query.instructorId ? asPositiveId(query.instructorId) : undefined,
    cycleId: query.cycleId ? asPositiveId(query.cycleId) : undefined,
    from: asTrimmedString(query.from) || undefined,
    to: asTrimmedString(query.to) || undefined,
  }
  if (filters.instructorId === null || filters.cycleId === null) throw new AppError(400, 'Invalid filter.')
  for (const name of ['from', 'to']) {
    if (filters[name] && !isValidDate(filters[name])) throw new AppError(400, 'Dates must be YYYY-MM-DD.')
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new AppError(400, 'The "from" date must not be after the "to" date.')
  }
  return filters
}
