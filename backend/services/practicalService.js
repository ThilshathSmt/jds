// Business rules for practical training and the practical driving test.
//
//   A practical cycle starts when the admin records PASSED for a student's driving school
//   examination (examDateRequestService.recordResult -> startFirstCycle). Its provisional
//   test date is the approved exam date + 90 days, moved to Monday when it is a weekend.
//   The cycle has exactly 10 lessons (created with it) and up to 4 instructors, assigned and
//   scheduled by an admin. Each lesson's instructor marks attendance (Attended / Absent).
//   When every lesson is marked and at least one instructor feedback is submitted, the
//   admin confirms the practical test date: the provisional date, or another one. That is
//   attempt 1. Its date can be changed until the result is recorded.
//   Results: PASSED ends the cycle. A first or second FAILED result costs the practical
//   reattempt fee (system_settings, copied to the attempt): the student uploads proof, an
//   admin verifies it, and only then can the next attempt be scheduled. A third FAILED
//   result exhausts the cycle and locks the account: the student submits a new
//   registration application (reapplicationService), and approving it starts the next
//   cycle (startNextCycle) with fresh lessons and no attempts used.
//
// What the server alone decides, whatever a browser sends: dates, fees, attempt numbers,
// who may act on what, and that every change happens once (rows are locked and UNIQUE keys
// refuse duplicates). Every function that changes something takes `now` last.

import path from 'node:path'
import { withTransaction } from '../config/database.js'
import {
  LESSON_TIME_FIRST,
  LESSON_TIME_LAST,
  LESSON_TIME_STEP_MINUTES,
  LESSONS_PER_CYCLE,
  APPROVED_LESSON_LOCATIONS,
  MAX_INSTRUCTORS_PER_CYCLE,
  PRACTICAL_ATTEMPTS_PER_CYCLE,
  PROVISIONAL_TEST_DAYS,
} from '../config/practical.js'
import * as feedbackModel from '../models/feedbackModel.js'
import * as practicalModel from '../models/practicalModel.js'
import * as userModel from '../models/userModel.js'
import AppError from '../utils/AppError.js'
import { addDays, addDaysToWeekday, formatLongDate, getSchoolDate, getSchoolTime, isValidDate } from '../utils/dateUtils.js'
import { generateAutomaticLessonSchedule } from '../utils/automaticLessonSchedule.js'
import { RECEIPT_TYPES, hasValidSignature } from '../utils/fileUtils.js'
import { NOTIFICATION_TYPES, notify, notifyRole } from './notificationService.js'
import { getSettings } from './settingsService.js'

const CYCLE_NOT_FOUND = 'Practical training record not found.'
const LESSON_NOT_FOUND = 'Lesson not found.'
const PAYMENT_NOT_FOUND = 'Payment not found.'
const NOT_ACTIVE = 'This practical training cycle is closed: nothing in it can be changed.'
const RESULT_RECORDED = 'The result of this practical test has already been recorded.'
// How far ahead a lesson or test may be scheduled
export const SCHEDULE_HORIZON_DAYS = 365

const formatFee = (amount) => `LKR ${amount.toLocaleString('en-US')}`

// The provisional practical test date for a driving school exam passed on `examDate`
export const getProvisionalTestDate = (examDate) => addDaysToWeekday(examDate, PROVISIONAL_TEST_DAYS)

// ---- Shapes sent to the browser

const toInstructor = (row) => ({
  id: row.id,
  name: row.name,
  drivingSchoolId: row.driving_school_id,
  responsibility: row.responsibility,
  status: row.status,
})

const toLesson = (row) => ({
  id: row.id,
  lessonNumber: row.lesson_number,
  date: row.lesson_date,
  time: row.start_time,
  location: row.location,
  instructor: row.instructor_id
    ? {
        id: row.instructor_id,
        name: row.instructor_name,
        drivingSchoolId: row.instructor_driving_school_id,
        responsibility: row.instructor_responsibility,
      }
    : null,
  attendance: row.attendance,
  attendanceMarkedBy: row.marked_by_name ?? null,
  attendanceMarkedAt: row.attendance_marked_at,
})

const toAttempt = (row) => ({
  id: row.id,
  attemptNumber: row.attempt_number,
  attemptsPerCycle: PRACTICAL_ATTEMPTS_PER_CYCLE,
  testDate: row.test_date,
  result: row.result ?? 'PENDING',
  remarks: row.remarks,
  reattemptFee: row.reattempt_fee,
  scheduledAt: row.scheduled_at,
  recordedAt: row.recorded_at,
})

const toPayment = (row) => ({
  id: row.id,
  attemptNumber: row.attempt_number,
  feeAmount: row.fee_amount,
  paymentMethod: row.payment_method,
  status: row.status,
  rejectionReason: row.rejection_reason,
  receipt: { originalName: row.original_name, mimeType: row.mime_type, sizeBytes: row.size_bytes },
  reviewedAt: row.reviewed_at,
  createdAt: row.created_at,
})

const getProgress = (lessons) => {
  const count = (attendance) => lessons.filter((lesson) => lesson.attendance === attendance).length
  return {
    total: LESSONS_PER_CYCLE,
    attended: count('ATTENDED'),
    absent: count('ABSENT'),
    pending: count('PENDING'),
    scheduled: lessons.filter((lesson) => lesson.lesson_date).length,
  }
}

// Where the practical test of a cycle stands, and what may happen next. Worked out from the
// rows only. `today` is the school date.
const STUDENT_MESSAGES = {
  IN_TRAINING: 'Complete your practical lessons. The school will confirm your practical test date afterwards.',
  AWAITING_DATE: 'Your lessons are complete. The school will confirm your practical test date.',
  SCHEDULED: 'Your practical driving test is scheduled. Please prepare well and be ready for your examination.',
  RESULT_DUE: 'Your practical driving test result will be recorded by the school.',
  PAYMENT_REQUIRED: 'Your practical test was unsuccessful. Pay the practical reattempt fee and upload the receipt to book your next attempt.',
  PAYMENT_PENDING: 'Your practical reattempt payment is awaiting verification by the school.',
  PAYMENT_REJECTED: 'Your practical reattempt payment was not approved. Review the reason and upload valid proof again.',
  AWAITING_NEXT_DATE: 'Your payment has been verified. The school will confirm the date of your next practical test.',
  PASSED: 'Congratulations! You have passed your practical driving test.',
  EXHAUSTED: 'All three practical test attempts of this cycle have been used. Submit a new registration application to continue.',
}

const getTestState = ({ cycle, attempts, payments, progress, feedbackCount, today }) => {
  const latest = attempts.at(-1) ?? null
  const requirements = {
    lessonsMarked: progress.attended + progress.absent,
    lessonsTotal: LESSONS_PER_CYCLE,
    feedbackSubmitted: feedbackCount,
  }
  const requirementsMet = requirements.lessonsMarked === LESSONS_PER_CYCLE && feedbackCount > 0
  const base = { requirements, requirementsMet, canSchedule: false, scheduleKind: null, canRecordResult: false, openAttempt: null, owedAttempt: null, payment: null }

  let state
  if (cycle.status === 'PASSED') state = 'PASSED'
  else if (cycle.status === 'EXHAUSTED') state = 'EXHAUSTED'
  else if (!latest) {
    state = requirementsMet ? 'AWAITING_DATE' : 'IN_TRAINING'
    base.canSchedule = requirementsMet
    base.scheduleKind = 'FIRST'
  } else if (!latest.result) {
    state = latest.test_date <= today ? 'RESULT_DUE' : 'SCHEDULED'
    base.openAttempt = toAttempt(latest)
    base.canSchedule = true
    base.scheduleKind = 'RESCHEDULE'
    base.canRecordResult = latest.test_date <= today
  } else if (latest.result === 'FAILED') {
    // The payment for this failure: the approved one, else the newest
    const forAttempt = payments.filter((payment) => payment.failed_attempt_id === latest.id)
    const payment = forAttempt.find((item) => item.status === 'APPROVED') ?? forAttempt[0] ?? null
    base.owedAttempt = toAttempt(latest)
    base.payment = payment ? toPayment(payment) : null
    if (payment?.status === 'APPROVED') {
      state = 'AWAITING_NEXT_DATE'
      base.canSchedule = true
      base.scheduleKind = 'NEXT'
    } else if (payment?.status === 'PENDING') state = 'PAYMENT_PENDING'
    else state = payment?.status === 'REJECTED' ? 'PAYMENT_REJECTED' : 'PAYMENT_REQUIRED'
  } else state = 'PASSED'

  return {
    ...base,
    state,
    message: STUDENT_MESSAGES[state],
    attemptsUsed: attempts.filter((attempt) => attempt.result).length,
    attemptsPerCycle: PRACTICAL_ATTEMPTS_PER_CYCLE,
    canPay: state === 'PAYMENT_REQUIRED' || state === 'PAYMENT_REJECTED',
  }
}

// Everything about one cycle, as the admin sees it. The student view leaves some parts out.
const loadCycle = async (cycle, now) => {
  await practicalModel.ensureLessons(cycle.id)
  const [instructors, lessons, attempts, payments, feedbackCount, settings] = await Promise.all([
    practicalModel.findCycleInstructors(cycle.id),
    practicalModel.findLessonsByCycle(cycle.id),
    practicalModel.findAttemptsByCycle(cycle.id),
    practicalModel.findPaymentsByCycle(cycle.id),
    feedbackModel.countSubmittedByCycle(cycle.id),
    getSettings(),
  ])
  const progress = getProgress(lessons)
  const firstAttempt = attempts.find((attempt) => attempt.attempt_number === 1) ?? null
  return {
    id: cycle.id,
    cycleNumber: cycle.cycle_number,
    status: cycle.status,
    student: {
      id: cycle.user_id,
      name: cycle.student_name,
      drivingSchoolId: cycle.driving_school_id,
      locked: cycle.student_locked_at !== null,
    },
    examDate: cycle.exam_date,
    // Kept separately: the original calculation is never overwritten
    provisionalTestDate: cycle.provisional_test_date,
    finalTestDate: firstAttempt?.test_date ?? null,
    finalTestDateConfirmedAt: firstAttempt?.scheduled_at ?? null,
    instructors: instructors.map(toInstructor),
    maxInstructors: MAX_INSTRUCTORS_PER_CYCLE,
    lessons: lessons.map(toLesson),
    progress,
    attempts: attempts.map(toAttempt),
    payments: payments.map(toPayment),
    feedbackCount,
    practicalReattemptFee: settings.practicalReattemptFee,
    test: getTestState({ cycle, attempts, payments, progress, feedbackCount, today: getSchoolDate(now) }),
    // What the lesson schedule form allows (the server checks the same)
    lessonRules: {
      earliestDate: getEarliestLessonDate(cycle, now),
      latestDate: addDays(getSchoolDate(now), SCHEDULE_HORIZON_DAYS),
      timeFirst: LESSON_TIME_FIRST,
      timeLast: LESSON_TIME_LAST,
      stepMinutes: LESSON_TIME_STEP_MINUTES,
    },
    createdAt: cycle.created_at,
  }
}

const findCycleOr404 = async (id, db, options) => {
  const cycle = await practicalModel.findCycleById(id, db, options)
  if (!cycle) throw new AppError(404, CYCLE_NOT_FOUND)
  return cycle
}

const assertActive = (cycle) => {
  if (cycle.status !== 'ACTIVE') throw new AppError(409, NOT_ACTIVE)
}

// The first day a lesson can be scheduled: the later of the day after the approved driving
// school exam date and today (dates in Sri Lanka, 'YYYY-MM-DD'). A cycle started by a
// reapplication has no exam date: from today.
export const getEarliestLessonDate = (cycle, now = new Date()) => {
  const today = getSchoolDate(now)
  const afterExam = cycle.exam_date ? addDays(cycle.exam_date, 1) : today
  return afterExam > today ? afterExam : today
}

// A date for a lesson or test: from today (in Sri Lanka) up to a year ahead
const assertSchedulable = (date, now, field) => {
  const today = getSchoolDate(now)
  let message = ''
  if (date < today) message = 'Choose today or a later date.'
  else if (date > addDays(today, SCHEDULE_HORIZON_DAYS)) message = 'Choose a date within the next 12 months.'
  if (message) throw new AppError(400, message, { [field]: message })
}

// ---- Starting cycles (called inside other services' transactions)

// The driving school examination was passed: the student's first practical cycle, with its
// provisional test date and 10 lessons. Returns { cycleId, provisionalTestDate }, or null
// when the student already has a practical cycle (nothing is created twice).
export const startFirstCycle = async ({ userId, attemptId, examDate }, db) => {
  if (await practicalModel.findLatestCycleByUser(userId, db, { forUpdate: true })) return null
  const provisionalTestDate = getProvisionalTestDate(examDate)
  const cycleId = await practicalModel.createCycle(
    { userId, cycleNumber: 1, sourceAttemptId: attemptId, examDate, provisionalTestDate },
    db,
  )
  await practicalModel.ensureLessons(cycleId, db)
  return { cycleId, provisionalTestDate }
}

// The student's latest practical cycle when all its attempts were used, else null. Used by
// the reapplication rules: this is one of the two reasons an account is locked.
export const findExhaustedCycle = async (userId, db) => {
  const cycle = await practicalModel.findLatestCycleByUser(userId, db)
  return cycle?.status === 'EXHAUSTED' ? cycle : null
}

// A reapplication after three failed practical tests was approved: the next cycle, with
// fresh lessons and no attempts used. Earlier cycles stay as they are.
export const startNextCycle = async ({ userId, applicationId }, db) => {
  const latest = await practicalModel.findLatestCycleByUser(userId, db, { forUpdate: true })
  if (latest?.status !== 'EXHAUSTED') {
    throw new AppError(409, 'This student has not used all practical test attempts of the current cycle.')
  }
  const cycleId = await practicalModel.createCycle(
    { userId, cycleNumber: latest.cycle_number + 1, applicationId },
    db,
  )
  await practicalModel.ensureLessons(cycleId, db)
  return cycleId
}

// The attempts of a student's latest practical cycle, for the reapplication review
export const getExhaustedCycleHistory = async (userId) => {
  const cycles = await practicalModel.findCyclesByUser(userId)
  const history = []
  for (const cycle of cycles) {
    history.push({
      cycleNumber: cycle.cycle_number,
      applicationId: cycle.application_id,
      status: cycle.status,
      attempts: (await practicalModel.findAttemptsByCycle(cycle.id)).map(toAttempt),
    })
  }
  return history
}

// ---- Admin

export const listCycles = async ({ status }) =>
  (await practicalModel.findCyclesForAdmin({ status })).map((row) => ({
    id: row.id,
    cycleNumber: row.cycle_number,
    status: row.status,
    student: { id: row.user_id, name: row.student_name, drivingSchoolId: row.driving_school_id, locked: row.student_locked_at !== null },
    examDate: row.exam_date,
    provisionalTestDate: row.provisional_test_date,
    finalTestDate: row.final_test_date,
    instructorCount: row.instructor_count,
    progress: { total: LESSONS_PER_CYCLE, attended: row.attended, absent: row.absent, scheduled: row.scheduled },
    attemptsScheduled: row.attempts_scheduled,
    feedbackCount: row.feedback_count,
    createdAt: row.created_at,
  }))

export const getCycleDetails = async (id, now = new Date()) => loadCycle(await findCycleOr404(id), now)

export const listActiveInstructors = async () => (await practicalModel.findActiveInstructors()).map(toInstructor)

// Replaces the cycle's instructors with `instructorIds` (at most 4 active instructors). An
// instructor who still has lessons in the cycle cannot be removed: reassign them first.
export const setInstructors = async (cycleId, adminId, { instructorIds }, now = new Date()) => {
  if (instructorIds.length > MAX_INSTRUCTORS_PER_CYCLE) {
    const message = `A student can have at most ${MAX_INSTRUCTORS_PER_CYCLE} instructors.`
    throw new AppError(400, message, { instructorIds: message })
  }
  await withTransaction(async (db) => {
    const cycle = await findCycleOr404(cycleId, db, { forUpdate: true })
    assertActive(cycle)
    const found = await practicalModel.findInstructorsByIds(instructorIds, db)
    const valid = found.filter((row) => row.role === 'instructor' && row.status === 'active')
    if (valid.length !== instructorIds.length) {
      const message = 'Choose active instructor accounts only.'
      throw new AppError(400, message, { instructorIds: message })
    }
    const current = await practicalModel.findCycleInstructors(cycleId, db)
    const removed = current.filter((row) => !instructorIds.includes(row.id))
    for (const instructor of removed) {
      if ((await practicalModel.countLessonsOfInstructor(cycleId, instructor.id, db)) > 0) {
        throw new AppError(409, `${instructor.name} still has lessons in this schedule. Assign those lessons to another instructor first.`)
      }
      await practicalModel.removeCycleInstructor(cycleId, instructor.id, db)
    }
    for (const id of instructorIds) {
      if (!current.some((row) => row.id === id)) await practicalModel.addCycleInstructor(cycleId, id, adminId, db)
    }
  })
  return getCycleDetails(cycleId, now)
}

// Schedules or reschedules one of the 10 lessons. Only while no practical test date has
// been confirmed and attendance has not been marked for the lesson.
export const updateLesson = async (cycleId, lessonNumber, adminId, input, now = new Date()) => {
  await withTransaction(async (db) => {
    const cycle = await findCycleOr404(cycleId, db, { forUpdate: true })
    assertActive(cycle)
    if ((await practicalModel.findAttemptsByCycle(cycleId, db)).length > 0) {
      throw new AppError(409, 'The practical test date has been confirmed: the lesson schedule can no longer be changed.')
    }
    await practicalModel.ensureLessons(cycleId, db)
    const lesson = await practicalModel.findLessonByNumber(cycleId, lessonNumber, db, { forUpdate: true })
    if (!lesson) throw new AppError(404, LESSON_NOT_FOUND)
    if (lesson.attendance !== 'PENDING') {
      throw new AppError(409, 'Attendance has already been marked for this lesson, so it cannot be rescheduled.')
    }
    if (!(await practicalModel.isCycleInstructor(cycleId, input.instructorId, db))) {
      const message = "Choose one of the student's assigned instructors."
      throw new AppError(400, message, { instructorId: message })
    }
    const [instructor] = await practicalModel.findInstructorsByIds([input.instructorId], db)
    if (!instructor || instructor.role !== 'instructor' || instructor.status !== 'active') {
      throw new AppError(400, 'Choose an active instructor assigned to this cycle.')
    }
    assertSchedulable(input.date, now, 'date')
    const earliest = getEarliestLessonDate(cycle, now)
    if (input.date < earliest) {
      const message = `Choose ${formatLongDate(earliest)} or a later date: lessons start after the driving school exam pass date.`
      throw new AppError(400, message, { date: message })
    }
    const conflicts = await practicalModel.findLessonScheduleConflicts({
      cycleId, lessonId: lesson.id, studentId: cycle.user_id, instructorId: input.instructorId,
      lessonDate: input.date, startTime: input.time,
    }, db)
    if (conflicts.student) throw new AppError(409, 'This student already has another lesson at that date and time.')
    if (conflicts.instructor) throw new AppError(409, 'This instructor already has another lesson at that date and time.')
    await practicalModel.updateLessonSchedule(
      lesson.id,
      { instructorId: input.instructorId, lessonDate: input.date, startTime: input.time, location: input.location, updatedBy: adminId },
      db,
    )
  })
  return getCycleDetails(cycleId, now)
}

// Generate a review-only proposal against the first cycle's stored provisional test date.
// The database's date was computed by getProvisionalTestDate (passed exam + 90 days,
// moved to Monday on weekends). No proposal rows are persisted here.
export const proposeAutomaticLessonSchedule = async (cycleId, now = new Date()) => {
  const cycle = await findCycleOr404(cycleId)
  assertActive(cycle)
  if ((await practicalModel.findAttemptsByCycle(cycleId)).length > 0) {
    throw new AppError(409, 'The practical test has been scheduled: the lesson schedule can no longer be changed.')
  }
  const lessons = await practicalModel.findLessonsByCycle(cycleId)
  if (lessons.some((lesson) => lesson.lesson_date || lesson.start_time || lesson.location || lesson.instructor_id)) {
    throw new AppError(409, 'This cycle already has saved lesson details. Edit those lessons instead of generating a replacement schedule.')
  }
  const targetDate = cycle.provisional_test_date
  if (!targetDate || !isValidDate(targetDate)) {
    throw new AppError(409, 'Automatic scheduling needs a valid provisional practical test date. This cycle has no test date recorded.')
  }
  const earliestDate = getEarliestLessonDate(cycle, now)
  const horizonDate = addDays(getSchoolDate(now), SCHEDULE_HORIZON_DAYS)
  const beforeTestDate = addDays(targetDate, -1)
  const latestDate = beforeTestDate < horizonDate ? beforeTestDate : horizonDate
  let proposedLessons
  try {
    proposedLessons = generateAutomaticLessonSchedule({
      earliestDate, latestDate, count: LESSONS_PER_CYCLE,
    })
  } catch {
    throw new AppError(409, `There are not 10 available dates between ${formatLongDate(earliestDate)} and the provisional practical test date (${formatLongDate(targetDate)}). No schedule was generated.`)
  }
  return { targetDate, earliestDate, latestDate, lessons: proposedLessons, locations: APPROVED_LESSON_LOCATIONS }
}

// Confirms the date of the cycle's next practical test, or changes the date of the one
// already scheduled (before its result). `keepProvisional` confirms attempt 1 on the
// provisional date; otherwise `testDate` is used. The student is notified only here.
export const scheduleTest = async (cycleId, adminId, { keepProvisional, testDate }, now = new Date()) => {
  try {
    await withTransaction(async (db) => {
      const cycle = await findCycleOr404(cycleId, db, { forUpdate: true })
      assertActive(cycle)
      if (cycle.student_locked_at !== null) throw new AppError(409, "This student's account is locked.")
      const attempts = await practicalModel.findAttemptsByCycle(cycleId, db, { forUpdate: true })
      const latest = attempts.at(-1) ?? null

      let date = testDate
      if (keepProvisional) {
        if (!cycle.provisional_test_date) throw new AppError(409, 'This cycle has no provisional date: choose a date.')
        if (latest && latest.attempt_number !== 1) throw new AppError(409, 'The provisional date only applies to the first practical test.')
        date = cycle.provisional_test_date
      }
      assertSchedulable(date, now, 'testDate')
      const when = formatLongDate(date)

      if (!latest) {
        // First test: only once the lessons are complete and an instructor has reported
        const progress = getProgress(await practicalModel.findLessonsByCycle(cycleId, db))
        if (progress.attended + progress.absent < LESSONS_PER_CYCLE) {
          throw new AppError(409, `Attendance must be marked for all ${LESSONS_PER_CYCLE} lessons before the practical test date is confirmed.`)
        }
        if ((await feedbackModel.countSubmittedByCycle(cycleId, db)) === 0) {
          throw new AppError(409, 'At least one instructor feedback must be submitted before the practical test date is confirmed.')
        }
        await practicalModel.createAttempt({ cycleId, userId: cycle.user_id, attemptNumber: 1, testDate: date, scheduledBy: adminId, scheduledAt: now }, db)
        const kept = date === cycle.provisional_test_date
        await notify(cycle.user_id, kept
          ? { type: NOTIFICATION_TYPES.practicalTestDateConfirmed, title: 'Practical Test Date Confirmed', message: `Your practical driving test is scheduled for ${when}. Please prepare well and be ready for your examination.`, practicalCycleId: cycleId }
          : { type: NOTIFICATION_TYPES.practicalTestDateUpdated, title: 'Practical Test Date Confirmed', message: `Your practical driving test date has been updated to ${when}. Please prepare well for your examination.`, practicalCycleId: cycleId },
        db)
        return
      }

      if (!latest.result) {
        if (latest.test_date === date) throw new AppError(409, 'The practical test is already scheduled for this date.')
        await practicalModel.updateAttemptDate(latest.id, { testDate: date, scheduledBy: adminId, scheduledAt: now }, db)
        await notify(cycle.user_id, {
          type: NOTIFICATION_TYPES.practicalTestDateUpdated,
          title: 'Practical Test Date Updated',
          message: `Your practical driving test date has been updated to ${when}. Please prepare well for your examination.`,
          practicalCycleId: cycleId,
        }, db)
        return
      }

      if (latest.result === 'PASSED') throw new AppError(409, 'This student has passed the practical test.')
      if (latest.attempt_number >= PRACTICAL_ATTEMPTS_PER_CYCLE) throw new AppError(409, 'All practical test attempts of this cycle have been used.')
      // The fee for the failure must have been verified before the next test is booked
      const approved = (await practicalModel.findPaymentsByCycle(cycleId, db)).some(
        (payment) => payment.failed_attempt_id === latest.id && payment.status === 'APPROVED',
      )
      if (!approved) {
        throw new AppError(409, `The practical reattempt fee for attempt ${latest.attempt_number} has not been verified yet.`)
      }
      const next = latest.attempt_number + 1
      await practicalModel.createAttempt({ cycleId, userId: cycle.user_id, attemptNumber: next, testDate: date, scheduledBy: adminId, scheduledAt: now }, db)
      await notify(cycle.user_id, {
        type: NOTIFICATION_TYPES.practicalTestDateConfirmed,
        title: 'Practical Test Date Confirmed',
        message: `Your practical driving test (attempt ${next} of ${PRACTICAL_ATTEMPTS_PER_CYCLE}) is scheduled for ${when}. Please prepare well and be ready for your examination.`,
        practicalCycleId: cycleId,
      }, db)
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'This practical test has already been scheduled.')
    throw error
  }
  return getCycleDetails(cycleId, now)
}

// Records PASSED or FAILED for the scheduled attempt, once, on or after its test date
export const recordResult = async (cycleId, attemptNumber, adminId, { result, remarks }, now = new Date()) => {
  await withTransaction(async (db) => {
    const cycle = await findCycleOr404(cycleId, db, { forUpdate: true })
    const attempts = await practicalModel.findAttemptsByCycle(cycleId, db, { forUpdate: true })
    const attempt = attempts.find((row) => row.attempt_number === attemptNumber)
    if (!attempt) throw new AppError(404, 'Practical test attempt not found.')
    if (attempt.result) throw new AppError(409, RESULT_RECORDED)
    assertActive(cycle)
    if (attempt.test_date > getSchoolDate(now)) {
      throw new AppError(409, 'The result can only be recorded on or after the scheduled test date.')
    }

    const failed = result === 'FAILED'
    const exhausts = failed && attemptNumber >= PRACTICAL_ATTEMPTS_PER_CYCLE
    // The fee for the next attempt, fixed now so a later change of the setting does not alter it
    const fee = failed && !exhausts ? (await getSettings(db)).practicalReattemptFee : null
    const changed = await practicalModel.recordAttemptResult(
      attempt.id,
      { result, remarks, reattemptFee: fee, recordedBy: adminId, recordedAt: now },
      db,
    )
    if (!changed) throw new AppError(409, RESULT_RECORDED)

    const label = `attempt ${attemptNumber} of ${PRACTICAL_ATTEMPTS_PER_CYCLE}`
    if (!failed) {
      await practicalModel.markCycleStatus(cycleId, 'PASSED', db)
      await notify(cycle.user_id, {
        type: NOTIFICATION_TYPES.practicalTestPassed,
        title: 'Practical Driving Test Passed',
        message: 'Congratulations! You have passed your practical driving test.',
        practicalCycleId: cycleId,
      }, db)
    } else if (exhausts) {
      await practicalModel.markCycleStatus(cycleId, 'EXHAUSTED', db)
      // The existing account lock: login and every session end until a new registration
      // application is approved
      await userModel.setLocked(cycle.user_id, now, db)
      await userModel.incrementSessionVersion(cycle.user_id, db)
      await notify(cycle.user_id, {
        type: NOTIFICATION_TYPES.practicalAttemptsExhausted,
        title: 'Three Practical Test Attempts Used',
        message: 'All three practical test attempts have been used. Submit a new registration application with a new medical report, package and registration payment.',
        practicalCycleId: cycleId,
      }, db)
    } else {
      await notify(cycle.user_id, {
        type: NOTIFICATION_TYPES.practicalTestFailed,
        title: 'Practical Driving Test Result',
        message: `Your practical test (${label}) was unsuccessful. Pay the ${formatFee(fee)} reattempt fee and upload the receipt to book your next attempt.`,
        practicalCycleId: cycleId,
      }, db)
    }
  })
  return getCycleDetails(cycleId, now)
}

// Locks the payment, checks it is still PENDING, runs `apply(payment, db)`
const decidePayment = async (id, apply) => {
  const cycleId = await withTransaction(async (db) => {
    const payment = await practicalModel.findPaymentById(id, db, { forUpdate: true })
    if (!payment) throw new AppError(404, PAYMENT_NOT_FOUND)
    if (payment.status !== 'PENDING') {
      throw new AppError(409, payment.status === 'APPROVED' ? 'This payment has already been approved.' : 'This payment has already been rejected.')
    }
    await apply(payment, db)
    return payment.cycle_id
  })
  return cycleId
}

export const approvePayment = async (id, adminId, now = new Date()) => {
  try {
    const cycleId = await decidePayment(id, async (payment, db) => {
      await practicalModel.markPaymentApproved(id, { reviewedBy: adminId, reviewedAt: now }, db)
      await notify(payment.user_id, {
        type: NOTIFICATION_TYPES.practicalPaymentApproved,
        title: 'Practical Reattempt Payment Approved',
        message: 'Your practical reattempt payment has been verified. The school will confirm the date of your next practical test.',
        practicalCycleId: payment.cycle_id,
      }, db)
    })
    return getCycleDetails(cycleId, now)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'A payment for this attempt has already been approved.')
    throw error
  }
}

export const rejectPayment = async (id, adminId, { reason }, now = new Date()) => {
  const cycleId = await decidePayment(id, async (payment, db) => {
    await practicalModel.markPaymentRejected(id, { reason, reviewedBy: adminId, reviewedAt: now }, db)
    await notify(payment.user_id, {
      type: NOTIFICATION_TYPES.practicalPaymentRejected,
      title: 'Practical Reattempt Payment Rejected',
      message: `Your practical reattempt payment was not approved. Reason: ${reason.replace(/[.\s]+$/, '')}. Please upload valid proof again.`,
      practicalCycleId: payment.cycle_id,
    }, db)
  })
  return getCycleDetails(cycleId, now)
}

// Where a receipt is on disk and how to serve it. `studentId` limits it to their own.
export const getPaymentFile = async (id, { studentId } = {}) => {
  const payment = await practicalModel.findPaymentById(id)
  if (!payment || (studentId !== undefined && payment.user_id !== studentId)) throw new AppError(404, PAYMENT_NOT_FOUND)
  return {
    storedName: payment.stored_name,
    mimeType: payment.mime_type,
    downloadName: `practical-reattempt-${id}-receipt${path.extname(payment.stored_name)}`,
  }
}

// ---- Student. `student` is req.user.

// The student's practical training: the latest cycle (null when there is none yet)
export const getStudentOverview = async (student, now = new Date()) => {
  const cycle = await practicalModel.findLatestCycleByUser(student.id)
  if (!cycle) return { cycle: null }
  const details = await loadCycle(cycle, now)
  return { cycle: details }
}

// One of the student's own cycles, for the notification that links to it
export const getStudentCycle = async (id, student, now = new Date()) => {
  const cycle = await practicalModel.findCycleById(id)
  if (!cycle || cycle.user_id !== student.id) throw new AppError(404, CYCLE_NOT_FOUND)
  return loadCycle(cycle, now)
}

// Proof of the practical reattempt fee for the student's latest failed test. The amount is
// the one fixed on that attempt. It stays PENDING until an admin verifies it.
export const submitPayment = async (student, { paymentMethod }, file, now = new Date()) => {
  if (!file) {
    const message = 'Please upload the payment receipt/document.'
    throw new AppError(400, message, { receipt: message })
  }
  const mimeType = RECEIPT_TYPES[path.extname(file.originalname).toLowerCase()]
  if (!(await hasValidSignature(file.path, mimeType))) {
    const message = 'The uploaded file is not a valid PDF, JPG, JPEG or PNG file.'
    throw new AppError(400, message, { receipt: message })
  }
  try {
    await withTransaction(async (db) => {
      const cycle = await practicalModel.findLatestCycleByUser(student.id, db, { forUpdate: true })
      if (!cycle) throw new AppError(409, 'You have no practical test to pay for.')
      const attempts = await practicalModel.findAttemptsByCycle(cycle.id, db)
      const payments = await practicalModel.findPaymentsByCycle(cycle.id, db)
      const progress = getProgress(await practicalModel.findLessonsByCycle(cycle.id, db))
      const test = getTestState({ cycle, attempts, payments, progress, feedbackCount: 0, today: getSchoolDate(now) })
      if (!test.canPay) {
        throw new AppError(409, test.state === 'PAYMENT_PENDING' ? 'Your payment is already awaiting verification.' : 'No practical reattempt fee is due.')
      }
      const failed = attempts.at(-1)
      const paymentId = await practicalModel.createPayment({
        userId: student.id,
        cycleId: cycle.id,
        failedAttemptId: failed.id,
        feeAmount: failed.reattempt_fee ?? (await getSettings(db)).practicalReattemptFee,
        paymentMethod,
        originalName: path.basename(file.originalname).slice(0, 255),
        storedName: file.filename,
        mimeType,
        sizeBytes: file.size,
      }, db)
      await notifyRole('admin', {
        type: NOTIFICATION_TYPES.practicalPaymentSubmitted,
        title: 'New practical reattempt payment',
        message: `${student.name} (${student.drivingSchoolId}) has submitted a practical reattempt payment for verification (#${paymentId}).`,
        practicalCycleId: cycle.id,
      }, db)
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'Your payment is already awaiting verification.')
    throw error
  }
  return getStudentOverview(student, now)
}

// ---- Instructor. `instructor` is req.user.

// A lesson has taken place once its date has passed, or on its date once its start time
// has come (Sri Lanka time). A lesson without a time counts from the start of its date.
const hasTakenPlace = (row, now) => {
  if (!row.lesson_date) return false
  const today = getSchoolDate(now)
  if (row.lesson_date !== today) return row.lesson_date < today
  return !row.start_time || row.start_time <= getSchoolTime(now)
}

// Why attendance cannot be marked now, or null when it can. Attendance may be marked (and
// corrected) by the lesson's instructor while the cycle is active, once the lesson has taken
// place, and until a practical test date has been confirmed for the student.
const attendanceBlock = (row, now) => {
  if (row.cycle_status !== 'ACTIVE' || row.attempts_scheduled > 0) return 'CLOSED'
  if (!row.lesson_date) return 'NOT_SCHEDULED'
  if (!hasTakenPlace(row, now)) return 'NOT_YET'
  return null
}

export const listInstructorLessons = async (instructor, now = new Date()) =>
  (await practicalModel.findLessonsByInstructor(instructor.id)).map((row) => {
    const block = attendanceBlock(row, now)
    return {
      ...toLesson(row),
      student: { id: row.student_id, name: row.student_name, drivingSchoolId: row.student_driving_school_id },
      cycleNumber: row.cycle_number,
      cycleStatus: row.cycle_status,
      canMarkAttendance: block === null,
      // CLOSED | NOT_SCHEDULED | NOT_YET, or null when it can be marked
      attendanceBlockedReason: block,
    }
  })

export const markAttendance = async (lessonId, instructor, { attendance }, now = new Date()) => {
  await withTransaction(async (db) => {
    const lesson = await practicalModel.findLessonById(lessonId, db, { forUpdate: true })
    if (!lesson) throw new AppError(404, LESSON_NOT_FOUND)
    if (lesson.instructor_id !== instructor.id) {
      throw new AppError(403, 'This lesson is assigned to another instructor.')
    }
    const attempts = await practicalModel.findAttemptsByCycle(lesson.cycle_id, db)
    const block = attendanceBlock({ ...lesson, attempts_scheduled: attempts.length }, now)
    if (block === 'CLOSED') throw new AppError(409, 'Attendance for this training can no longer be changed.')
    if (block === 'NOT_SCHEDULED') throw new AppError(409, 'This lesson has not been scheduled yet.')
    if (block === 'NOT_YET') {
      throw new AppError(409, `Attendance can be marked once the lesson has taken place (${formatLongDate(lesson.lesson_date)}${lesson.start_time ? `, ${lesson.start_time}` : ''}).`)
    }
    await practicalModel.markAttendance(lessonId, { attendance, markedBy: instructor.id, markedAt: now }, db)
  })
  return (await listInstructorLessons(instructor, now)).find((lesson) => lesson.id === lessonId)
}
