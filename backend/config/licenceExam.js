// Rules of the physical driving licence examination attempts.
// The server applies these: a number sent by the browser is never trusted.
// The reattempt fee is a setting the admins manage (system_settings.exam_reattempt_fee,
// see services/settingsService.js); it is not fixed here.

// How many times a student may sit the examination with one medical report
export const ATTEMPTS_PER_CYCLE = 3

export const EXAM_RESULTS = ['PASSED', 'FAILED']

// Days of the week on which the physical examination can be held, numbered as
// Date.getUTCDay() does (0 = Sunday ... 6 = Saturday). Admins choose which of these are
// currently offered on the "Driving Exam" page (system_settings.exam_allowed_weekdays, see
// services/settingsService.js); Saturday and Sunday are never examination days.
export const EXAM_WEEKDAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
}
export const SELECTABLE_EXAM_WEEKDAYS = [1, 2, 3, 4, 5]
// Used until an admin saves a choice: Tuesdays only, as before the setting existed
export const DEFAULT_EXAM_WEEKDAYS = [2]

// The stored setting is a bitmask, one bit per weekday: [2, 5] (Tuesday, Friday) <-> 36
export const examWeekdaysToMask = (weekdays) => weekdays.reduce((mask, weekday) => mask | (1 << weekday), 0)

// Bits for Saturday, Sunday or anything else are ignored. An empty choice (never saved by
// the admin page) falls back to the default so students always have an examination day.
export const maskToExamWeekdays = (mask) => {
  const weekdays = SELECTABLE_EXAM_WEEKDAYS.filter((weekday) => (mask & (1 << weekday)) !== 0)
  return weekdays.length > 0 ? weekdays : [...DEFAULT_EXAM_WEEKDAYS]
}

// [1, 3, 5] -> 'Monday, Wednesday or Friday'
export const formatExamWeekdays = (weekdays, conjunction = 'or') => {
  const names = weekdays.map((weekday) => EXAM_WEEKDAY_NAMES[weekday])
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${conjunction} ${names.at(-1)}`
}
