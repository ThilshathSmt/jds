// Frontend validation for the account login / register forms.
// Each function returns { field: message }; an empty object means the form is valid.
// The backend repeats these checks (backend/utils/validationUtils.js); keep the two in step.

import { isValidEmail } from './registrationValidation'

const PASSWORD_MIN_LENGTH = 8

export const validateLogin = ({ schoolId, password }) => {
  const errors = {}
  if (!schoolId.trim()) errors.schoolId = 'Driving School Id is required.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

// The account registration form, once the Driving School ID has been verified (the name
// and e-mail are the application's and are not typed). `captcha` is the ticked box.
export const validateRegister = ({ schoolId, password, confirmPassword, captcha }) => {
  const errors = {}
  if (!schoolId.trim()) errors.schoolId = 'Driving School Id is required.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  if (!captcha) errors.captcha = 'Please confirm that you are not a robot.'
  return errors
}

// Admin "Create Instructor" form. The Driving School ID is issued by the backend.
export const validateInstructor = ({ name, email, password, confirmPassword, responsibility }) => {
  const errors = {}
  if (!name.trim()) errors.name = 'Full name is required.'
  else if (name.trim().length > 100) errors.name = 'Full name must be 100 characters or fewer.'
  if (!email.trim()) errors.email = 'E-mail address is required.'
  else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm the password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  if (!responsibility) errors.responsibility = 'Please select what the instructor is responsible for.'
  return errors
}

const getNewPasswordError = (password) => {
  if (!password) return 'Password is required.'
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  return ''
}

// Settings > Personal Information. `emailChanged` asks for the current password too.
export const validateProfile = ({ name, email, currentPassword }, { emailChanged }) => {
  const errors = {}
  const trimmedName = name.trim()
  if (!trimmedName) errors.name = 'Full name is required.'
  else if (trimmedName.length < 2) errors.name = 'Full name must be at least 2 characters.'
  else if (trimmedName.length > 100) errors.name = 'Full name must be 100 characters or fewer.'
  if (!email.trim()) errors.email = 'E-mail address is required.'
  else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address.'
  if (emailChanged && !currentPassword) {
    errors.currentPassword = 'Enter your current password to change your e-mail address.'
  }
  return errors
}

// Settings > Change Password
export const validateChangePassword = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {}
  if (!currentPassword) errors.currentPassword = 'Current password is required.'
  const passwordError = getNewPasswordError(newPassword)
  if (passwordError) errors.newPassword = passwordError
  else if (newPassword === currentPassword) {
    errors.newPassword = 'The new password must be different from the current password.'
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm the new password.'
  else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export const validateForgotPassword = ({ email }) => {
  if (!email.trim()) return { email: 'E-mail address is required.' }
  return isValidEmail(email.trim()) ? {} : { email: 'Enter a valid email address.' }
}

export const validateResetPassword = ({ password, confirmPassword }) => {
  const errors = {}
  const passwordError = getNewPasswordError(password)
  if (passwordError) errors.password = passwordError
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your new password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

// Profile pictures: the same rules the backend checks
export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024
const PICTURE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
export const PROFILE_PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp'

export const validateProfilePicture = (file) => {
  const name = file.name.toLowerCase()
  if (!PICTURE_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Please choose a JPG, PNG or WebP image.'
  }
  if (file.size > PROFILE_PICTURE_MAX_BYTES) return 'Maximum file size is 2 MB.'
  return ''
}
