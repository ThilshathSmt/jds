// Student theory exams. Student-only: the backend checks the session and role itself.

import { apiRequest } from './apiClient'

const STUDENT_PATH = '/api/student/exams'

// Resolves with [{ id, title, description, available }]
export const listExams = async () => {
  const { exams } = await apiRequest(STUDENT_PATH)
  return exams
}

// `examType` is an exam id such as 'heavy-vehicle'. Rejects with status 404 when unknown.
export const getExam = async (examType) => {
  const { exam } = await apiRequest(`${STUDENT_PATH}/${encodeURIComponent(examType)}`)
  return exam
}

// Practice papers of an exam category. Resolves with
// { exam, papers: [{ id, title: { en, ta, si }, questionCount, durationMinutes }] };
// `papers` may be empty.
export const listExamPapers = (examType) =>
  apiRequest(`${STUDENT_PATH}/${encodeURIComponent(examType)}/papers`)

// ---- Timed attempts. The backend owns the clock, the question order and the scoring;
// nothing sent from here can change them. An "attempt" below is the backend's view of it:
//   in_progress: { id, status, questions, answers, remainingSeconds, ... } (no correct answers)
//   submitted:   questions also carry selectedOptionId, correctOptionId and outcome

const ATTEMPTS_PATH = '/api/student/exam-attempts'

const paperPath = (examType, paperId) =>
  `${STUDENT_PATH}/${encodeURIComponent(examType)}/papers/${encodeURIComponent(paperId)}`

// Resolves with { exam, paper, sourceLanguage, contentLanguages, attempt, lastResult }:
// `attempt` is the student's unfinished attempt at the paper or null.
// Rejects with status 404 for an unknown exam or paper.
export const getPaperState = (examType, paperId) =>
  apiRequest(`${paperPath(examType, paperId)}/attempt`)

// Starts the attempt (and its timer). If one is already unfinished, that one comes back.
export const startAttempt = async (examType, paperId) => {
  const { attempt } = await apiRequest(`${paperPath(examType, paperId)}/attempts`, {
    method: 'POST',
  })
  return attempt
}

export const getAttempt = async (attemptId) => {
  const { attempt } = await apiRequest(`${ATTEMPTS_PATH}/${attemptId}`)
  return attempt
}

// Rejects with status 409 once the attempt is submitted or its time is up
export const saveAnswer = (attemptId, questionId, optionId) =>
  apiRequest(`${ATTEMPTS_PATH}/${attemptId}/answers/${encodeURIComponent(questionId)}`, {
    method: 'PUT',
    body: { optionId },
  })

const attemptAction = (action) => async (attemptId) => {
  const { attempt } = await apiRequest(`${ATTEMPTS_PATH}/${attemptId}/${action}`, {
    method: 'POST',
  })
  return attempt
}

// "Finish Attempt": resolves with the attempt, now ready for review
export const submitAttempt = attemptAction('submit')

// "Back to Quiz": rejects with status 409 when the time is up
export const resumeAttempt = attemptAction('resume')

// "Finish Review": resolves with the final result
export const finishReview = async (attemptId) => {
  const { result } = await apiRequest(`${ATTEMPTS_PATH}/${attemptId}/finish-review`, {
    method: 'POST',
  })
  return result
}

// Rejects with status 409 until the review has been finished
export const getAttemptResult = async (attemptId) => {
  const { result } = await apiRequest(`${ATTEMPTS_PATH}/${attemptId}/result`)
  return result
}
