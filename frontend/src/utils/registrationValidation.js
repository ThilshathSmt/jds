// Frontend validation for the registration flow.
// Each validateStepN returns an object of { field: message }; an empty object means the step is valid.
// TODO: The backend must repeat these checks when the form is connected to the API.

import { receiptRules } from '../data/registrationData'

const MOBILE_PATTERN = /^[0-9]{10}$/
const OLD_NIC_PATTERN = /^[0-9]{9}V$/
const NEW_NIC_PATTERN = /^[0-9]{12}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normalizeNic = (nic) => nic.toUpperCase()

export const isValidMobile = (mobile) => MOBILE_PATTERN.test(mobile)

export const isValidNic = (nic) => {
  const value = normalizeNic(nic)
  return OLD_NIC_PATTERN.test(value) || NEW_NIC_PATTERN.test(value)
}

// Email is optional: empty is valid
export const isValidEmail = (email) => email === '' || EMAIL_PATTERN.test(email)

// Returns a specific message for an unusable receipt file, or '' when the file is fine
export const getReceiptError = (file) => {
  if (!file) return ''
  const extension = file.name.split('.').pop().toLowerCase()
  if (!receiptRules.extensions.includes(extension)) {
    return 'Please upload a PDF, JPG, JPEG or PNG file.'
  }
  if (file.size > receiptRules.maxSizeBytes) return 'Maximum file size is 2 MB.'
  return ''
}

export const validateStep1 = ({ fullName, mobile, email, nic, address }) => {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Full name is required.'
  if (!isValidMobile(mobile)) errors.mobile = 'Mobile number must contain exactly 10 digits.'
  if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address.'
  if (!isValidNic(nic)) errors.nic = 'Enter a valid NIC: 9 digits + V or 12 digits.'
  if (!address.trim()) errors.address = 'Address is required.'
  return errors
}

export const validateStep2 = ({ packageId }) => {
  const errors = {}
  if (!packageId) errors.packageId = 'Please select a package to continue.'
  return errors
}

export const validateStep3 = ({ paymentMethod, receipt }) => {
  const errors = {}
  if (!paymentMethod) errors.paymentMethod = 'Please select a payment method.'
  if (!receipt) errors.receipt = 'Please upload the payment receipt/document.'
  else if (getReceiptError(receipt)) errors.receipt = 'Please upload a valid file under 2 MB.'
  return errors
}
