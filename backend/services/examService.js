// Business rules for the student theory exams. For now this only serves the exam
// categories; questions, timing, attempts and results will be added here later.

import { exams, findExamById } from '../config/exams.js'
import AppError from '../utils/AppError.js'

const QUESTIONS_NOTICE = 'Exam questions and examination instructions will be available here soon.'

const toCategory = (exam) => ({
  id: exam.id,
  title: exam.title,
  description: exam.description,
  available: exam.available,
})

export const listExams = async () => exams.map(toCategory)

// `examType` comes from the URL: anything that is not a known category does not exist
export const getExam = async (examType) => {
  const exam = findExamById(examType)
  if (!exam) throw new AppError(404, 'Exam category not found.')
  return { ...toCategory(exam), questionsAvailable: false, notice: QUESTIONS_NOTICE }
}
