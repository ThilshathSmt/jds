// HTTP handling for practical training, the practical driving test and instructor
// feedback. Rules live in services/practicalService.js and services/feedbackService.js.
// The signed-in user (req.user) decides whose records are reached; nothing in the request
// can name another student or instructor.

import env from '../config/env.js'
import * as feedbackService from '../services/feedbackService.js'
import * as practicalService from '../services/practicalService.js'
import { removeFile } from '../utils/fileUtils.js'
import { sendSuccess } from '../utils/responseUtils.js'
import {
  parseId,
  validateAttendanceInput,
  validateFeedbackFilters,
  validateFeedbackInput,
  validateInstructorIdsInput,
  validateLessonInput,
  validatePracticalResultInput,
  validatePracticalStatusFilter,
  validateReattemptRequestInput,
  validateRejectionReasonInput,
  validateTestScheduleInput,
} from '../utils/validationUtils.js'

const sendFile = (res, file, download) =>
  res.sendFile(
    file.storedName,
    {
      root: env.practicalUploadsDir,
      dotfiles: 'allow',
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${file.downloadName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    },
    (error) => {
      if (error && !res.headersSent) res.status(404).json({ success: false, message: 'Receipt file not found.' })
    },
  )

// ---- Admin (/api/admin/practical)

export const listCycles = async (req, res) => {
  const cycles = await practicalService.listCycles({ status: validatePracticalStatusFilter(req.query.status) })
  sendSuccess(res, { message: 'Practical training', data: { cycles } })
}

export const getCycle = async (req, res) => {
  const cycle = await practicalService.getCycleDetails(parseId(req.params.id))
  sendSuccess(res, { message: 'Practical training', data: { cycle } })
}

export const listInstructors = async (req, res) => {
  const instructors = await practicalService.listActiveInstructors()
  sendSuccess(res, { message: 'Instructors', data: { instructors } })
}

export const setInstructors = async (req, res) => {
  const cycle = await practicalService.setInstructors(parseId(req.params.id), req.user.id, validateInstructorIdsInput(req.body))
  sendSuccess(res, { message: 'Instructors saved.', data: { cycle } })
}

export const updateLesson = async (req, res) => {
  const lessonNumber = parseId(req.params.lessonNumber)
  const cycle = await practicalService.updateLesson(parseId(req.params.id), lessonNumber, req.user.id, validateLessonInput(req.body))
  sendSuccess(res, { message: `Lesson ${lessonNumber} saved.`, data: { cycle } })
}

export const scheduleTest = async (req, res) => {
  const cycle = await practicalService.scheduleTest(parseId(req.params.id), req.user.id, validateTestScheduleInput(req.body))
  sendSuccess(res, { message: 'Practical test date confirmed. The student has been notified.', data: { cycle } })
}

export const recordResult = async (req, res) => {
  const cycle = await practicalService.recordResult(
    parseId(req.params.id),
    parseId(req.params.attemptNumber),
    req.user.id,
    validatePracticalResultInput(req.body),
  )
  sendSuccess(res, { message: 'Practical test result recorded. The student has been notified.', data: { cycle } })
}

export const approvePayment = async (req, res) => {
  const cycle = await practicalService.approvePayment(parseId(req.params.paymentId), req.user.id)
  sendSuccess(res, { message: 'Payment approved.', data: { cycle } })
}

export const rejectPayment = async (req, res) => {
  const cycle = await practicalService.rejectPayment(parseId(req.params.paymentId), req.user.id, validateRejectionReasonInput(req.body))
  sendSuccess(res, { message: 'Payment rejected.', data: { cycle } })
}

export const getPaymentReceipt = async (req, res) =>
  sendFile(res, await practicalService.getPaymentFile(parseId(req.params.paymentId)), Boolean(req.query.download))

export const listFeedbacks = async (req, res) => {
  const feedbacks = await feedbackService.listSubmitted(validateFeedbackFilters(req.query))
  sendSuccess(res, { message: 'Instructor feedback', data: { feedbacks } })
}

// ---- Student (/api/student/practical)

export const getStudentOverview = async (req, res) => {
  const overview = await practicalService.getStudentOverview(req.user)
  sendSuccess(res, { message: 'Practical training', data: overview })
}

export const getStudentCycle = async (req, res) => {
  const cycle = await practicalService.getStudentCycle(parseId(req.params.id), req.user)
  sendSuccess(res, { message: 'Practical training', data: { cycle } })
}

export const submitPayment = async (req, res) => {
  try {
    const overview = await practicalService.submitPayment(req.user, validateReattemptRequestInput(req.body), req.file)
    sendSuccess(res, { statusCode: 201, message: 'Your payment has been submitted for verification.', data: overview })
  } catch (error) {
    // Nothing was saved, so do not keep the uploaded file
    if (req.file) await removeFile(req.file.path)
    throw error
  }
}

export const getOwnPaymentReceipt = async (req, res) =>
  sendFile(res, await practicalService.getPaymentFile(parseId(req.params.paymentId), { studentId: req.user.id }), false)

// ---- Instructor (/api/instructor)

export const listInstructorLessons = async (req, res) => {
  const lessons = await practicalService.listInstructorLessons(req.user)
  sendSuccess(res, { message: 'Your lessons', data: { lessons } })
}

export const markAttendance = async (req, res) => {
  const lesson = await practicalService.markAttendance(parseId(req.params.id), req.user, validateAttendanceInput(req.body))
  sendSuccess(res, { message: 'Attendance saved.', data: { lesson } })
}

export const getInstructorStudents = async (req, res) => {
  const students = await feedbackService.getInstructorStudents(req.user)
  sendSuccess(res, { message: 'Your students', data: { students } })
}

export const listOwnFeedbacks = async (req, res) => {
  const feedbacks = await feedbackService.listOwn(req.user)
  sendSuccess(res, { message: 'Your feedback', data: { feedbacks } })
}

export const createFeedback = async (req, res) => {
  const input = validateFeedbackInput(req.body)
  const feedback = await feedbackService.create(req.user, input)
  sendSuccess(res, { statusCode: 201, message: input.submit ? 'Feedback submitted.' : 'Draft saved.', data: { feedback } })
}

export const updateFeedback = async (req, res) => {
  const input = validateFeedbackInput(req.body)
  const feedback = await feedbackService.update(parseId(req.params.id), req.user, input)
  sendSuccess(res, { message: input.submit ? 'Feedback submitted.' : 'Draft saved.', data: { feedback } })
}
