import { PAYMENT_METHODS, findPackageById } from '../config/packages.js'
import AppError from './AppError.js'

export const ROLES = ['admin', 'student', 'instructor']
// Roles an admin may issue an ID for directly. Student IDs are issued only by approving
// a registration application; admin accounts are created by the seeder only.
export const PROVISIONABLE_ROLES = ['instructor']

export const APPLICATION_STATUSES = ['NEW', 'APPROVED', 'SUSPENDED']

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

// Route ids (/:id). Anything that is not a positive whole number cannot match a record.
export const parseId = (value) => {
  if (!/^[1-9][0-9]{0,9}$/.test(String(value))) throw new AppError(404, 'Record not found.')
  return Number(value)
}
