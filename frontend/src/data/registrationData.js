// Static data for the online registration flow.
// TODO: Load packages and payment details from the backend once the API exists.

export const registrationSteps = [
  { id: 1, label: 'Your Details' },
  { id: 2, label: 'Package Details' },
  { id: 3, label: 'Payment Details' },
]

// Placeholder packages and fees
export const packages = [
  { id: 1, name: 'All Cars / Dual Purpose – Manual / Auto (B)', price: 40000 },
  { id: 2, name: 'VIP Course (Pick & Drop)', price: 60000 },
  { id: 3, name: 'Motorcycle (A, A-1)', price: 12500 },
  { id: 4, name: '1 Hour Individual Lesson (B)', price: 3500 },
  { id: 5, name: 'Theory Class', price: 3000 },
]

export const formatAmount = (amount) => `Rs. ${amount.toLocaleString('en-US')}`
export const formatPrice = (price) => `${formatAmount(price)}/=`

// Registration payment rule: packages up to the threshold are paid in full,
// more expensive packages need at least MINIMUM_PAYMENT_RATE of the price up front.
// TODO: The backend must apply the same rule when payments are verified.
export const FULL_PAYMENT_THRESHOLD = 10000
export const MINIMUM_PAYMENT_RATE = 0.4

export const getMinimumPayment = (price) => {
  const isFullPayment = price <= FULL_PAYMENT_THRESHOLD
  return {
    isFullPayment,
    minimumPayment: isFullPayment ? price : Math.round(price * MINIMUM_PAYMENT_RATE),
  }
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
