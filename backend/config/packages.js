// The registration payment rule. The packages themselves and the advance payment
// percentage live in the database (driving_school_packages, system_settings) and are
// managed by the admins: see services/settingsService.js. A price or amount sent by the
// browser is never trusted.

export const PAYMENT_METHODS = ['bank-transfer', 'visit-branch']

// Packages up to this price (LKR) are paid in full when registering
export const FULL_PAYMENT_THRESHOLD = 10000

// The minimum paid with a registration: the full price up to the threshold, otherwise the
// configured percentage of it, in whole rupees
export const getMinimumPayment = (price, advancePaymentPercent) =>
  price <= FULL_PAYMENT_THRESHOLD ? price : Math.round((price * advancePaymentPercent) / 100)
