// Course packages, fees and the registration payment rule.
// The server looks prices up here: a price sent by the browser is never trusted.
// NOTE: mirrors frontend/src/data/registrationData.js; keep the two in step until
// packages are stored in the database and served to the frontend.

export const packages = [
  { id: 1, name: 'All Cars / Dual Purpose – Manual / Auto (B)', price: 40000 },
  { id: 2, name: 'VIP Course (Pick & Drop)', price: 60000 },
  { id: 3, name: 'Motorcycle (A, A-1)', price: 12500 },
  { id: 4, name: '1 Hour Individual Lesson (B)', price: 3500 },
  { id: 5, name: 'Theory Class', price: 3000 },
]

export const PAYMENT_METHODS = ['bank-transfer', 'visit-branch']

export const findPackageById = (id) => packages.find((item) => item.id === id) ?? null

// Packages up to the threshold are paid in full; dearer ones need at least 40% up front
const FULL_PAYMENT_THRESHOLD = 10000
const MINIMUM_PAYMENT_RATE = 0.4

export const getMinimumPayment = (price) =>
  price <= FULL_PAYMENT_THRESHOLD ? price : Math.round(price * MINIMUM_PAYMENT_RATE)
