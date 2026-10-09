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

export const validateRegister = ({ schoolId, name, email, password, confirmPassword }) => {
  const errors = {}
  if (!schoolId.trim()) errors.schoolId = 'Driving School Id is required.'
  if (!name.trim()) errors.name = 'Your name is required.'
  if (!email.trim()) errors.email = 'E-mail address is required.'
  else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
