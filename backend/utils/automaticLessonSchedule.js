import {
  APPROVED_LESSON_LOCATIONS,
  AUTOMATIC_LESSON_TIME_FIRST,
  AUTOMATIC_LESSON_TIME_LAST,
  LESSON_TIME_STEP_MINUTES,
} from '../config/practical.js'
import { isValidDate } from './dateUtils.js'

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const dateAt = (isoDate, dayOffset) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + dayOffset * 86_400_000).toISOString().slice(0, 10)
const randomIndex = (length, random) => Math.min(length - 1, Math.floor(Math.max(0, random()) * length))

// Produces a review-only proposal. It never writes lessons or assigns instructors.
export const generateAutomaticLessonSchedule = ({ earliestDate, latestDate, count = 10, random = Math.random }) => {
  const first = Date.parse(`${earliestDate}T00:00:00Z`)
  const last = Date.parse(`${latestDate}T00:00:00Z`)
  const dayCount = Math.floor((last - first) / 86_400_000) + 1
  if (!isValidDate(earliestDate) || !isValidDate(latestDate) || !Number.isFinite(first) || !Number.isFinite(last) || dayCount < count) {
    throw new RangeError(`At least ${count} valid calendar days are required to schedule the lessons.`)
  }

  const firstMinutes = minutesOf(AUTOMATIC_LESSON_TIME_FIRST)
  const lastMinutes = minutesOf(AUTOMATIC_LESSON_TIME_LAST)
  const timeSlots = []
  for (let minute = firstMinutes; minute <= lastMinutes; minute += LESSON_TIME_STEP_MINUTES) {
    timeSlots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`)
  }

  const dates = Array.from({ length: count }, (_, index) => {
    const from = Math.floor((index * dayCount) / count)
    const to = Math.floor(((index + 1) * dayCount) / count) - 1
    return dateAt(earliestDate, from + randomIndex(to - from + 1, random))
  })
  dates.sort()

  return dates.map((date, index) => ({
    lessonNumber: index + 1,
    date,
    time: timeSlots[randomIndex(timeSlots.length, random)],
    location: APPROVED_LESSON_LOCATIONS[randomIndex(APPROVED_LESSON_LOCATIONS.length, random)],
    instructorId: null,
    attendance: 'PENDING',
  }))
}
