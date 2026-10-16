// Rules of practical training and the practical driving test. The server applies these:
// a number sent by the browser is never trusted. The practical reattempt fee is a setting
// the admins manage (system_settings.practical_reattempt_fee, see settingsService.js).

// Lessons in every practical cycle, numbered 1 to LESSONS_PER_CYCLE
export const LESSONS_PER_CYCLE = 10

// Instructors who may be assigned to one student's cycle
export const MAX_INSTRUCTORS_PER_CYCLE = 4

// Practical test attempts in one cycle; the last failure locks the account
export const PRACTICAL_ATTEMPTS_PER_CYCLE = 3

// The provisional practical test date is this many calendar days after the approved date
// of the passed driving school examination (moved to Monday when it is a weekend)
export const PROVISIONAL_TEST_DAYS = 90

// Lesson start times: every 15 minutes from 07:00 to 19:00 (both included), 'HH:MM'
export const LESSON_TIME_FIRST = '07:00'
export const LESSON_TIME_LAST = '19:00'
export const LESSON_TIME_STEP_MINUTES = 15

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

// True for '07:00', '07:15', ... '19:00'; false for '07:07', '06:45', '19:15' or anything
// that is not 'HH:MM'
export const isLessonTimeSlot = (time) => {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false
  const minutes = toMinutes(time)
  return (
    minutes >= toMinutes(LESSON_TIME_FIRST) &&
    minutes <= toMinutes(LESSON_TIME_LAST) &&
    minutes % LESSON_TIME_STEP_MINUTES === 0
  )
}

export const ATTENDANCE_STATUSES = ['PENDING', 'ATTENDED', 'ABSENT']
export const MARKABLE_ATTENDANCE = ['ATTENDED', 'ABSENT']
export const PRACTICAL_RESULTS = ['PASSED', 'FAILED']

export const SAFETY_RATINGS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
export const RECOMMENDATIONS = ['READY_FOR_TEST', 'NEEDS_MORE_PRACTICE']
