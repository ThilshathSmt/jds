// Business rules for instructor feedback on a student's practical training.
//
//   An instructor may write feedback only for a cycle they are assigned to, about lessons
//   they taught (assigned to them and marked Attended). It is a DRAFT until submitted:
//   only its author sees and edits a draft. A submitted feedback is final and the admins see
//   it. Feedback is advisory: the admin decides the practical test date.

import { withTransaction } from '../config/database.js'
import * as feedbackModel from '../models/feedbackModel.js'
import * as practicalModel from '../models/practicalModel.js'
import AppError from '../utils/AppError.js'
import { addDays } from '../utils/dateUtils.js'
import { NOTIFICATION_TYPES, notifyRole } from './notificationService.js'

const NOT_FOUND = 'Feedback not found.'

const toFeedback = (row, lessons = []) => ({
  id: row.id,
  cycleId: row.cycle_id,
  cycleNumber: row.cycle_number,
  status: row.status,
  student: { id: row.student_id, name: row.student_name, drivingSchoolId: row.student_driving_school_id },
  instructor: { id: row.instructor_id, name: row.instructor_name, drivingSchoolId: row.instructor_driving_school_id },
  lessons: lessons.map((lesson) => ({ id: lesson.id, lessonNumber: lesson.lesson_number, date: lesson.lesson_date })),
  drivingSkills: row.driving_skills,
  strengths: row.strengths,
  improvements: row.improvements,
  safetyAwareness: row.safety_awareness,
  comments: row.comments,
  recommendation: row.recommendation,
  submittedAt: row.submitted_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const withLessons = async (rows) => {
  const lessons = await feedbackModel.findLessonsOf(rows.map((row) => row.id))
  return rows.map((row) => toFeedback(row, lessons[row.id]))
}

// Everything a submitted feedback must contain
const SUBMIT_REQUIRED = {
  drivingSkills: "Describe the student's driving skills and progress.",
  strengths: 'Describe the strengths.',
  improvements: 'Describe the areas requiring improvement.',
  safetyAwareness: 'Rate the safety awareness.',
  recommendation: 'Choose a recommendation.',
}

// Checks the instructor teaches the cycle and the lessons are theirs and attended
const checkScope = async (instructorId, cycleId, lessonIds, submitting, db) => {
  const cycle = await practicalModel.findCycleById(cycleId, db)
  if (!cycle || !(await practicalModel.isCycleInstructor(cycleId, instructorId, db))) {
    const message = 'Choose a student you are assigned to teach.'
    throw new AppError(400, message, { cycleId: message })
  }
  const lessons = await practicalModel.findLessonsByCycle(cycleId, db)
  const taught = new Set(
    lessons.filter((lesson) => lesson.instructor_id === instructorId && lesson.attendance === 'ATTENDED').map((lesson) => lesson.id),
  )
  if (lessonIds.some((id) => !taught.has(id))) {
    const message = 'Choose only lessons you taught this student (marked Attended).'
    throw new AppError(400, message, { lessonIds: message })
  }
  if (submitting && lessonIds.length === 0) {
    const message = 'Choose at least one lesson you taught this student.'
    throw new AppError(400, message, { lessonIds: message })
  }
  return cycle
}

const checkComplete = (input) => {
  const errors = {}
  for (const [field, message] of Object.entries(SUBMIT_REQUIRED)) if (!input[field]) errors[field] = message
  if (Object.keys(errors).length > 0) throw new AppError(400, 'Please complete the feedback before submitting it.', errors)
}

const notifySubmitted = (instructor, cycle, db) =>
  notifyRole('admin', {
    type: NOTIFICATION_TYPES.practicalFeedbackSubmitted,
    title: 'New instructor feedback',
    message: `${instructor.name} submitted feedback for ${cycle.student_name} (${cycle.driving_school_id}).`,
    practicalCycleId: cycle.id,
  }, db)

// ---- Instructor. `instructor` is req.user.

// The students the instructor teaches, with the lessons they taught each, for the form
export const getInstructorStudents = async (instructor) => {
  const lessons = await practicalModel.findLessonsByInstructor(instructor.id)
  const byCycle = new Map()
  for (const lesson of lessons) {
    if (!byCycle.has(lesson.cycle_id)) {
      byCycle.set(lesson.cycle_id, {
        cycleId: lesson.cycle_id,
        cycleNumber: lesson.cycle_number,
        cycleStatus: lesson.cycle_status,
        student: { id: lesson.student_id, name: lesson.student_name, drivingSchoolId: lesson.student_driving_school_id },
        lessons: [],
      })
    }
    if (lesson.attendance === 'ATTENDED') {
      byCycle.get(lesson.cycle_id).lessons.push({ id: lesson.id, lessonNumber: lesson.lesson_number, date: lesson.lesson_date })
    }
  }
  // Only cycles the instructor is still assigned to
  const result = []
  for (const entry of byCycle.values()) {
    if (await practicalModel.isCycleInstructor(entry.cycleId, instructor.id)) result.push(entry)
  }
  return result
}

export const listOwn = async (instructor) => withLessons(await feedbackModel.findByInstructor(instructor.id))

// `input` is validated: { cycleId, lessonIds, drivingSkills, ..., submit }
export const create = async (instructor, { submit, cycleId, lessonIds, ...fields }, now = new Date()) => {
  if (submit) checkComplete(fields)
  const id = await withTransaction(async (db) => {
    const cycle = await checkScope(instructor.id, cycleId, lessonIds, submit, db)
    const newId = await feedbackModel.create({
      cycleId,
      studentId: cycle.user_id,
      instructorId: instructor.id,
      status: submit ? 'SUBMITTED' : 'DRAFT',
      submittedAt: submit ? now : null,
      ...fields,
    }, db)
    await feedbackModel.replaceLessons(newId, lessonIds, db)
    if (submit) await notifySubmitted(instructor, cycle, db)
    return newId
  })
  return (await withLessons([await feedbackModel.findById(id)]))[0]
}

// Only the author's own DRAFT can change; submitting makes it final
export const update = async (id, instructor, { submit, cycleId, lessonIds, ...fields }, now = new Date()) => {
  if (submit) checkComplete(fields)
  await withTransaction(async (db) => {
    const existing = await feedbackModel.findById(id, db, { forUpdate: true })
    // The same answer for "does not exist" and "belongs to another instructor"
    if (!existing || existing.instructor_id !== instructor.id) throw new AppError(404, NOT_FOUND)
    if (existing.status !== 'DRAFT') throw new AppError(409, 'This feedback has been submitted and can no longer be changed.')
    if (cycleId !== existing.cycle_id) throw new AppError(400, 'The student of a feedback cannot be changed.')
    const cycle = await checkScope(instructor.id, cycleId, lessonIds, submit, db)
    await feedbackModel.update(id, { status: submit ? 'SUBMITTED' : 'DRAFT', submittedAt: submit ? now : null, ...fields }, db)
    await feedbackModel.replaceLessons(id, lessonIds, db)
    if (submit) await notifySubmitted(instructor, cycle, db)
  })
  return (await withLessons([await feedbackModel.findById(id)]))[0]
}

// ---- Admin

// Submitted feedback. `from` / `to` are 'YYYY-MM-DD' days in Sri Lanka (UTC+05:30, no
// daylight saving), turned into exact moments here.
const startOfSchoolDay = (isoDate) => new Date(`${isoDate}T00:00:00+05:30`)

export const listSubmitted = async ({ cycleId, instructorId, search, from, to }) =>
  withLessons(
    await feedbackModel.findSubmitted({
      cycleId,
      instructorId,
      search,
      from: from ? startOfSchoolDay(from) : undefined,
      to: to ? startOfSchoolDay(addDays(to, 1)) : undefined,
    }),
  )
