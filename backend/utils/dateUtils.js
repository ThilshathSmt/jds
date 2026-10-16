// Calendar dates for the physical exam date requests. A date is always a 'YYYY-MM-DD'
// string: it names a day in Sri Lanka, not a moment in time, so it is never turned into a
// local Date (which would shift it on a server running in another time zone).

export const SCHOOL_TIME_ZONE = 'Asia/Colombo'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000
const TUESDAY = 2

const localDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const longDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// The date in Sri Lanka at the moment `now`
export const getSchoolDate = (now = new Date()) => {
  const parts = Object.fromEntries(
    localDateFormat.formatToParts(now).map(({ type, value }) => [type, value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const localTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: SCHOOL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// The time of day in Sri Lanka at the moment `now`, as 'HH:MM'
export const getSchoolTime = (now = new Date()) => {
  const parts = Object.fromEntries(
    localTimeFormat.formatToParts(now).map(({ type, value }) => [type, value]),
  )
  return `${parts.hour}:${parts.minute}`
}

// Midnight UTC of the date, used only for weekday and day arithmetic. Returns null for
// anything that is not a real calendar date (for example 2026-02-30).
const toUtc = (isoDate) => {
  const match = typeof isoDate === 'string' ? ISO_DATE_PATTERN.exec(isoDate) : null
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return real ? date : null
}

export const isValidDate = (isoDate) => toUtc(isoDate) !== null

export const isTuesday = (isoDate) => toUtc(isoDate)?.getUTCDay() === TUESDAY

export const addDays = (isoDate, days) =>
  new Date(toUtc(isoDate).getTime() + days * DAY_MS).toISOString().slice(0, 10)

// 0 = Sunday ... 6 = Saturday
export const getWeekday = (isoDate) => toUtc(isoDate).getUTCDay()

// `days` calendar days after `isoDate`; a Saturday or Sunday becomes the following Monday.
// Pure date arithmetic on 'YYYY-MM-DD' strings, so no time zone can shift the result.
export const addDaysToWeekday = (isoDate, days) => {
  const date = addDays(isoDate, days)
  const weekday = getWeekday(date)
  if (weekday === 6) return addDays(date, 2)
  if (weekday === 0) return addDays(date, 1)
  return date
}

// '2026-10-20' -> 'Tuesday, 20 October 2026'
export const formatLongDate = (isoDate) => {
  const parts = Object.fromEntries(
    longDateFormat.formatToParts(toUtc(isoDate)).map(({ type, value }) => [type, value]),
  )
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`
}
