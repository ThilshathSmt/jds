import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { APPROVED_LESSON_LOCATIONS } from '../config/practical.js'
import { generateAutomaticLessonSchedule } from '../utils/automaticLessonSchedule.js'
import { validateLessonInput } from '../utils/validationUtils.js'

describe('generateAutomaticLessonSchedule', () => {
  const input = { earliestDate: '2026-01-01', latestDate: '2026-03-31', random: () => 0.5 }

  test('proposes ten distinct dates inside the allowed range, without persistence or instructors', () => {
    const lessons = generateAutomaticLessonSchedule(input)
    assert.equal(lessons.length, 10)
    assert.deepEqual(lessons.map((lesson) => lesson.lessonNumber), Array.from({ length: 10 }, (_, index) => index + 1))
    assert.equal(new Set(lessons.map((lesson) => lesson.date)).size, 10)
    assert.ok(lessons.every(({ date }) => date >= input.earliestDate && date <= input.latestDate))
    assert.ok(lessons.every(({ instructorId, attendance }) => instructorId === null && attendance === 'PENDING'))
    assert.ok(lessons.some((lesson, index) => index > 0 && (Date.parse(`${lesson.date}T00:00:00Z`) - Date.parse(`${lessons[index - 1].date}T00:00:00Z`)) > 86_400_000))
  })

  test('uses only 15-minute start slots from 8:00 AM through 6:00 PM and approved locations', () => {
    const lessons = generateAutomaticLessonSchedule(input)
    assert.ok(lessons.every(({ time }) => {
      const [hours, minutes] = time.split(':').map(Number)
      const total = hours * 60 + minutes
      return total >= 8 * 60 && total <= 18 * 60 && minutes % 15 === 0
    }))
    assert.ok(lessons.every(({ location }) => APPROVED_LESSON_LOCATIONS.includes(location)))
  })

  test('rejects invalid dates and date ranges that cannot fit ten distinct lessons', () => {
    assert.throws(() => generateAutomaticLessonSchedule({ earliestDate: '2026-02-30', latestDate: '2026-03-31' }), /valid calendar days/)
    assert.throws(() => generateAutomaticLessonSchedule({ earliestDate: '2026-01-01', latestDate: '2026-01-09' }), /valid calendar days/)
  })

  test('lesson saves accept only the approved locations and normalize their existing case variant', () => {
    const lesson = { instructorId: 1, date: '2026-02-01', time: '08:00', location: 'walathapity' }
    assert.equal(validateLessonInput(lesson).location, 'Walathapity')
    assert.throws(() => validateLessonInput({ ...lesson, location: 'Somewhere else' }), (error) => error.errors.location.includes('Sammanthurai or Walathapity'))
  })
})
