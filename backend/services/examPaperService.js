// Business rules for the papers of an exam category: which papers exist and what a
// student is shown of their questions. Timed attempts, scoring and results are in
// examAttemptService.js.
//
// Responses are built field by field from the question data. The answer key is never read
// here, so a correct answer cannot end up in what a student receives.

import { SOURCE_LANGUAGE } from '../data/examPapers/index.js'
import * as examPaperModel from '../models/examPaperModel.js'
import AppError from '../utils/AppError.js'
import { getExam } from './examService.js'

export const toPaperSummary = (paper) => ({
  id: paper.id,
  title: paper.title,
  questionCount: paper.questions.length,
  durationMinutes: paper.durationMinutes,
})

export const toStudentQuestion = (question) => ({
  id: question.id,
  number: question.number,
  imageUrl: question.imageUrl,
  imageAlt: question.imageAlt,
  text: question.text,
  options: question.options.map((option) => ({ id: option.id, text: option.text })),
})

// Languages every question and option of the paper has been written in
export const getContentLanguages = (questions) => {
  if (questions.length === 0) return []
  const texts = questions.flatMap((question) => [question.text, ...question.options.map((o) => o.text)])
  return Object.keys(texts[0]).filter((language) => texts.every((text) => text[language]))
}

// Throws 404 for an unknown exam category. A category without papers gives an empty list.
export const listPapers = async (examType) => {
  const exam = await getExam(examType)
  const papers = await examPaperModel.findPapersByExam(exam.id)
  return { exam, papers: papers.map(toPaperSummary) }
}

// Throws 404 for an unknown exam category or paper. A paper without questions yet gives
// an empty `questions` list.
export const getPaperQuestions = async (examType, paperId) => {
  const exam = await getExam(examType)
  const paper = await examPaperModel.findPaper(exam.id, paperId)
  if (!paper) throw new AppError(404, 'Exam paper not found.')

  return {
    exam: { id: exam.id, title: exam.title },
    paper: toPaperSummary(paper),
    sourceLanguage: SOURCE_LANGUAGE,
    contentLanguages: getContentLanguages(paper.questions),
    questions: paper.questions.map(toStudentQuestion),
  }
}
