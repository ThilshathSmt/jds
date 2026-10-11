// Calendar dates for the physical exam date requests. A date is always a 'YYYY-MM-DD'
// string naming a day in Sri Lanka, so it reads the same on a computer set to any time
// zone. The backend applies the same rules again when a request is submitted.

const SCHOOL_TIME_ZONE = 'Asia/Colombo'
const TUESDAY = 2
const DAY_MS = 24 * 60 * 60 * 1000

export const MAX_PREFERRED_DATES = 3
// How many months ahead the calendar goes (the backend accepts dates up to a year ahead)
export const CALENDAR_MONTHS_AHEAD = 11

export const MEDICAL_REPORT_REQUIRED_MESSAGE =
  'Please submit your medical report before requesting a driving licence examination date.'

// Reasons an admin may give for rejecting a request; the codes are the backend's
export const rejectionReasons = [
  { code: 'MEDICAL_REPORT_NOT_SUBMITTED', label: 'Medical report not submitted' },
  { code: 'NO_SLOTS_AVAILABLE', label: 'No examination slots available' },
  { code: 'OTHER', label: 'Other' },
]

// Display names of the request statuses; the badge colours are in StatusBadge
export const requestStatusLabels = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }

const pad = (number) => String(number).padStart(2, '0')

const toUtc = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

const schoolDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Today's date in Sri Lanka
export const getSchoolDate = (now = new Date()) => {
  const parts = Object.fromEntries(
    schoolDateFormat.formatToParts(now).map(({ type, value }) => [type, value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const isTuesday = (isoDate) => toUtc(isoDate).getUTCDay() === TUESDAY

// A date a student may ask for: a Tuesday after today
export const isSelectableDate = (isoDate, today) => isTuesday(isoDate) && isoDate > today

// '2026-10' for the month of a date
export const getMonthKey = (isoDate) => isoDate.slice(0, 7)

// '2026-10' + 3 -> '2027-01'
export const addMonths = (monthKey, count) => {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + count, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

// The weeks of a month for a calendar that starts on Monday: rows of seven cells, each a
// 'YYYY-MM-DD' date or null for the empty cells before the 1st and after the last day
export const getMonthWeeks = (monthKey) => {
  const first = toUtc(`${monthKey}-01`)
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  // getUTCDay() counts from Sunday; shift so Monday is column 0
  const leading = (first.getUTCDay() + 6) % 7
  const cells = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (unused, index) => `${monthKey}-${pad(index + 1)}`),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (unused, week) => cells.slice(week * 7, week * 7 + 7))
}

// The first Tuesday after `today`: where the calendar opens
export const getNextTuesday = (today) => {
  let date = toUtc(today)
  do {
    date = new Date(date.getTime() + DAY_MS)
  } while (date.getUTCDay() !== TUESDAY)
  return date.toISOString().slice(0, 10)
}

const format = (options) => {
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })
  return (value) =>
    Object.fromEntries(formatter.formatToParts(value).map(({ type, value: text }) => [type, text]))
}
const longParts = format({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortParts = format({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const monthParts = format({ month: 'long', year: 'numeric' })

// '2026-10-20' -> 'Tuesday, 20 October 2026'
export const formatExamDate = (isoDate) => {
  const { weekday, day, month, year } = longParts(toUtc(isoDate))
  return `${weekday}, ${day} ${month} ${year}`
}

// '2026-10-20' -> 'Tue, 20 Oct 2026', for tables
export const formatExamDateShort = (isoDate) => {
  const { weekday, day, month, year } = shortParts(toUtc(isoDate))
  return `${weekday}, ${day} ${month} ${year}`
}

// '2026-10' -> 'October 2026'
export const formatMonth = (monthKey) => {
  const { month, year } = monthParts(toUtc(`${monthKey}-01`))
  return `${month} ${year}`
}

// The day of the month of a date, as a number
export const getDayNumber = (isoDate) => Number(isoDate.slice(8))
