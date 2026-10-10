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
// { exam, papers: [{ id, title: { en, ta, si }, questionCount }] }; `papers` may be empty.
export const listExamPapers = (examType) =>
  apiRequest(`${STUDENT_PATH}/${encodeURIComponent(examType)}/papers`)

// Questions of one paper, in every language they exist in. Resolves with
// { exam, paper, sourceLanguage, contentLanguages, questions }. The correct answers are
// never included. Rejects with status 404 for an unknown exam or paper.
export const getPaperQuestions = (examType, paperId) =>
  apiRequest(
    `${STUDENT_PATH}/${encodeURIComponent(examType)}/papers/${encodeURIComponent(paperId)}/questions`,
  )
