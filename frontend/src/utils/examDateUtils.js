// Calendar dates for the physical exam date requests. A date is always a 'YYYY-MM-DD'
// string naming a day in Sri Lanka, so it reads the same on a computer set to any time
// zone. The backend applies the same rules again when a request is submitted.

const SCHOOL_TIME_ZONE = 'Asia/Colombo'
const DAY_MS = 24 * 60 * 60 * 1000

export const MAX_PREFERRED_DATES = 3

// The days of the week, Monday first, numbered as getUTCDay() does (0 = Sunday). Admins
// choose on the Driving Exam page which of the `selectable` ones students may request;
// Saturday and Sunday are never examination days.
export const EXAM_WEEKDAYS = [
  { value: 1, name: 'Monday', selectable: true },
  { value: 2, name: 'Tuesday', selectable: true },
  { value: 3, name: 'Wednesday', selectable: true },
  { value: 4, name: 'Thursday', selectable: true },
  { value: 5, name: 'Friday', selectable: true },
  { value: 6, name: 'Saturday', selectable: false },
  { value: 0, name: 'Sunday', selectable: false },
]
const WEEKEND = [0, 6]
const weekdayName = (value) => EXAM_WEEKDAYS.find((weekday) => weekday.value === value)?.name ?? ''

// [2, 5] -> 'Tuesdays and Fridays'
export const formatExamWeekdays = (weekdays, conjunction = 'and') => {
  const names = [...weekdays]
    .sort((a, b) => a - b)
    .map((value) => `${weekdayName(value)}s`)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${conjunction} ${names.at(-1)}`
}
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

// 0 = Sunday ... 6 = Saturday
export const getWeekday = (isoDate) => toUtc(isoDate).getUTCDay()

// A date a student may ask for: after today, on one of `weekdays` (the examination days the
// admin offers), and never on a Saturday or Sunday
export const isSelectableDate = (isoDate, today, weekdays) => {
  const weekday = getWeekday(isoDate)
  return isoDate > today && !WEEKEND.includes(weekday) && weekdays.includes(weekday)
}

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

// The first date after `today` a student may ask for: where the calendar opens. The day
// after `today` when no weekday is offered.
export const getNextExamDate = (today, weekdays) => {
  const start = toUtc(today).getTime()
  for (let days = 1; days <= 7; days += 1) {
    const date = new Date(start + days * DAY_MS).toISOString().slice(0, 10)
    if (isSelectableDate(date, today, weekdays)) return date
  }
  return new Date(start + DAY_MS).toISOString().slice(0, 10)
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
