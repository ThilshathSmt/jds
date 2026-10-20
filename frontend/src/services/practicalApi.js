// Practical training (lessons), the practical driving test and instructor feedback. Every
// rule is the backend's: these calls only send what the user chose.
//
// A "cycle" is { id, cycleNumber, status: ACTIVE | PASSED | EXHAUSTED, student, examDate,
//   provisionalTestDate, finalTestDate, finalTestDateConfirmedAt, instructors, maxInstructors,
//   lessons: [{ id, lessonNumber, date, time, location, instructor, attendance,
//   attendanceMarkedBy, attendanceMarkedAt }], progress: { total, attended, absent, pending,
//   scheduled }, attempts, payments, feedbackCount, practicalReattemptFee,
//   test: { state, message, canSchedule, scheduleKind, canRecordResult, canPay, openAttempt,
//   owedAttempt, payment, requirements, requirementsMet, attemptsUsed, attemptsPerCycle } }.

import { API_URL, apiRequest } from './apiClient'

const ADMIN = '/api/admin/practical'
const STUDENT = '/api/student/practical'
const INSTRUCTOR = '/api/instructor'

// ---- Admin

export const listPracticalCycles = async (status = '') =>
  (await apiRequest(`${ADMIN}/cycles${status ? `?status=${status}` : ''}`)).cycles

export const getPracticalCycle = async (id) => (await apiRequest(`${ADMIN}/cycles/${id}`)).cycle

export const listAssignableInstructors = async () => (await apiRequest(`${ADMIN}/instructors`)).instructors

export const setCycleInstructors = async (id, instructorIds) =>
  (await apiRequest(`${ADMIN}/cycles/${id}/instructors`, { method: 'PUT', body: { instructorIds } })).cycle

// `lesson` is { instructorId, date: 'YYYY-MM-DD', time: 'HH:MM' | '', location }
export const updateLesson = async (id, lessonNumber, lesson) =>
  (await apiRequest(`${ADMIN}/cycles/${id}/lessons/${lessonNumber}`, { method: 'PUT', body: lesson })).cycle

export const proposeAutomaticLessonSchedule = (id) =>
  apiRequest(`${ADMIN}/cycles/${id}/lessons/automatic-proposal`, { method: 'POST' })

// `decision` is { keepProvisional: true } or { testDate: 'YYYY-MM-DD' }
export const schedulePracticalTest = async (id, decision) =>
  (await apiRequest(`${ADMIN}/cycles/${id}/test-date`, { method: 'POST', body: decision })).cycle

export const recordPracticalResult = async (id, attemptNumber, { result, remarks }) =>
  (await apiRequest(`${ADMIN}/cycles/${id}/attempts/${attemptNumber}/result`, { method: 'POST', body: { result, remarks } })).cycle

export const approvePracticalPayment = async (paymentId) =>
  (await apiRequest(`${ADMIN}/payments/${paymentId}/approve`, { method: 'POST' })).cycle

export const rejectPracticalPayment = async (paymentId, reason) =>
  (await apiRequest(`${ADMIN}/payments/${paymentId}/reject`, { method: 'POST', body: { reason } })).cycle

export const getPracticalReceiptUrl = (role, paymentId) =>
  `${API_URL}${role === 'admin' ? ADMIN : STUDENT}/payments/${paymentId}/receipt`

// `filters` = { search, instructorId, from, to, cycleId }; empty values are left out
export const listFeedbacks = async (filters = {}) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const query = params.toString()
  return (await apiRequest(`${ADMIN}/feedbacks${query ? `?${query}` : ''}`)).feedbacks
}

// ---- Student

// Resolves with { cycle } (null when practical training has not started)
export const getMyPractical = () => apiRequest(STUDENT)

export const getMyPracticalCycle = async (id) => (await apiRequest(`${STUDENT}/cycles/${id}`)).cycle

export const submitPracticalPayment = ({ paymentMethod, receipt }) => {
  const body = new FormData()
  body.append('paymentMethod', paymentMethod)
  body.append('receipt', receipt)
  return apiRequest(`${STUDENT}/payments`, { method: 'POST', body })
}

// ---- Instructor

export const listMyLessons = async (filters = {}) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const query = params.toString()
  return apiRequest(`${INSTRUCTOR}/lessons${query ? `?${query}` : ''}`)
}

export const listEligibleInstructorDrivingSchoolIds = async () =>
  (await apiRequest(`${INSTRUCTOR}/eligible-students`)).drivingSchoolIds

export const markLessonAttendance = async (lessonId, attendance) =>
  (await apiRequest(`${INSTRUCTOR}/lessons/${lessonId}/attendance`, { method: 'PUT', body: { attendance } })).lesson

export const listMyStudents = async () => (await apiRequest(`${INSTRUCTOR}/students`)).students

export const listMyFeedbacks = async () => (await apiRequest(`${INSTRUCTOR}/feedbacks`)).feedbacks

// `feedback` is { cycleId, lessonIds, drivingSkills, strengths, improvements,
// safetyAwareness, comments, recommendation, submit }
export const saveFeedback = async (id, feedback) =>
  (await apiRequest(id ? `${INSTRUCTOR}/feedbacks/${id}` : `${INSTRUCTOR}/feedbacks`, { method: id ? 'PUT' : 'POST', body: feedback })).feedback
