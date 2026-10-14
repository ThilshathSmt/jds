// Static data for the online registration flow.
// The packages, their prices and the advance payment percentage are NOT here: they are
// managed by the admins and loaded from the API (see useRegistrationOptions). The backend
// works out every amount itself; the calculation below only shows the student the same one.

export const registrationSteps = [
  { id: 1, label: 'Your Details' },
  { id: 2, label: 'Package Details' },
  { id: 3, label: 'Payment Details' },
]

export const formatAmount = (amount) => `Rs. ${amount.toLocaleString('en-US')}`
export const formatPrice = (price) => `${formatAmount(price)}/=`

// The registration payment rule, with the values from the API ({ advancePaymentPercent,
// fullPaymentThreshold }): packages up to the threshold are paid in full, more expensive
// ones need at least the configured percentage of the price up front. Mirrors
// backend/config/packages.js getMinimumPayment, which decides the amount actually recorded.
export const getMinimumPayment = (price, { advancePaymentPercent, fullPaymentThreshold }) => {
  const isFullPayment = price <= fullPaymentThreshold
  return {
    isFullPayment,
    minimumPayment: isFullPayment ? price : Math.round((price * advancePaymentPercent) / 100),
  }
}

// The minimum payment the form shows for the chosen package. Sent with the application
// only so the backend can tell when its own (authoritative) amount differs from it.
export const getQuotedMinimumPayment = (options, packageId) => {
  const selected = options.packages.find(({ id }) => id === packageId)
  return selected ? getMinimumPayment(selected.price, options).minimumPayment : ''
}

export const PAYMENT_METHODS = {
  bankTransfer: 'bank-transfer',
  visitBranch: 'visit-branch',
}

export const paymentMethods = [
  { id: PAYMENT_METHODS.bankTransfer, label: 'Bank Transfer' },
  { id: PAYMENT_METHODS.visitBranch, label: 'Visit a Branch' },
]

export const bankDetails = {
  bankName: 'Hatton National Bank (HNB)',
  bankBranch: 'Sammanthurai',
  accountNumber: '222020097048',
  accountName: 'ABM Jahir',
}

export const receiptRules = {
  maxSizeBytes: 2 * 1024 * 1024,
  extensions: ['pdf', 'jpg', 'jpeg', 'png'],
  accept: '.pdf,.jpg,.jpeg,.png',
}
