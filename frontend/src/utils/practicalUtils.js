// Display names for practical training and the practical test. The codes are the
// backend's; badge colours come from the statuses StatusBadge already knows.

import { formatExamDate, formatExamDateShort } from './examDateUtils'

// The admin Lessons page; a student's page is LESSONS_PATH/<cycle id>
export const LESSONS_PATH = '/admin-dashboard/lessons'

export const attendanceLabels = { PENDING: 'Pending', ATTENDED: 'Attended', ABSENT: 'Absent' }
// Attended -> green, Absent -> red, Pending -> amber
export const attendanceBadge = { PENDING: 'PENDING', ATTENDED: 'APPROVED', ABSENT: 'REJECTED' }

export const cycleStatusLabels = { ACTIVE: 'In training', PASSED: 'Passed', EXHAUSTED: 'Attempts used' }
export const cycleStatusBadge = { ACTIVE: 'NEW', PASSED: 'PASSED', EXHAUSTED: 'REJECTED' }

export const practicalResultLabels = { PENDING: 'Scheduled', PASSED: 'Passed', FAILED: 'Failed' }

export const testStateLabels = {
  IN_TRAINING: 'In training',
  AWAITING_DATE: 'Awaiting test date',
  SCHEDULED: 'Test scheduled',
  RESULT_DUE: 'Result due',
  PAYMENT_REQUIRED: 'Reattempt fee required',
  PAYMENT_PENDING: 'Payment awaiting verification',
  PAYMENT_REJECTED: 'Payment rejected',
  AWAITING_NEXT_DATE: 'Awaiting next test date',
  PASSED: 'Passed',
  EXHAUSTED: 'All attempts used',
}

export const safetyLabels = { EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor' }
export const recommendationLabels = {
  READY_FOR_TEST: 'Ready for practical test',
  NEEDS_MORE_PRACTICE: 'Needs more practice',
}

// 'YYYY-MM-DD' -> 'Monday, 6 April 2026'; '–' when there is none
export const formatDay = (date) => (date ? formatExamDate(date) : '–')
export const formatDayShort = (date) => (date ? formatExamDateShort(date) : '–')

// '14:30' -> '2:30 PM'
export const formatTime = (time) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

export const formatLessonWhen = (lesson) =>
  lesson.date ? `${formatDayShort(lesson.date)}${lesson.time ? `, ${formatTime(lesson.time)}` : ''}` : 'Not scheduled yet'

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const toTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// Every allowed lesson start time, 'HH:MM', from the backend's rules: `timeFirst` to
// `timeLast` (both included) every `stepMinutes` minutes
export const getTimeSlots = ({ timeFirst, timeLast, stepMinutes }) => {
  const slots = []
  for (let minutes = toMinutes(timeFirst); minutes <= toMinutes(timeLast); minutes += stepMinutes) {
    slots.push(toTime(minutes))
  }
  return slots
}

// Percentage of the lessons attended, for a progress bar
export const progressPercent = (progress) => Math.round((progress.attended / progress.total) * 100)
