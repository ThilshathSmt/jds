// Data access for exam practice papers, their questions and answer keys.
// The data lives in backend/data/examPapers for now. The functions are async so they can
// be switched to MySQL queries later without changing the services that call them.

import { answerKeys } from '../data/examPapers/answerKeys.js'
import { papersByExam } from '../data/examPapers/index.js'

// A broken paper would make scoring wrong later, so it is caught when the server starts:
// ids must be unique, numbers must run 1, 2, 3... without gaps or repeats, and every
// question needs four options and exactly one known answer.
const assertPapersAreConsistent = () => {
  for (const [examId, papers] of Object.entries(papersByExam)) {
    for (const paper of papers) {
      const label = `${examId}/${paper.id}`
      const key = answerKeys[label] ?? {}
      const questionIds = new Set()
      const fail = (problem) => {
        throw new Error(`Exam paper data error in ${label}: ${problem}`)
      }

      for (const [index, question] of paper.questions.entries()) {
        if (question.number !== index + 1) {
          fail(`question numbers must run in order without gaps: found ${question.number} at position ${index + 1}`)
        }
        if (questionIds.has(question.id)) fail(`duplicate question id ${question.id}`)
        questionIds.add(question.id)
        const optionIds = question.options.map((option) => option.id)
        if (optionIds.length !== 4 || new Set(optionIds).size !== 4) {
          fail(`${question.id} must have four options with different ids`)
        }
        if (!optionIds.includes(key[question.id])) {
          fail(`the answer key for ${question.id} is missing or is not one of its options`)
        }
      }
      for (const questionId of Object.keys(key)) {
        if (!questionIds.has(questionId)) fail(`answer key refers to unknown question ${questionId}`)
      }
    }
  }
}

assertPapersAreConsistent()

// Object.hasOwn: a name such as "constructor" in the URL must not match anything
export const findPapersByExam = async (examId) =>
  Object.hasOwn(papersByExam, examId) ? papersByExam[examId] : []

export const findPaper = async (examId, paperId) =>
  (await findPapersByExam(examId)).find((paper) => paper.id === paperId) ?? null

// { questionId: correctOptionId }. For server-side scoring only: never send this to a client.
export const findAnswerKey = async (examId, paperId) => {
  const label = `${examId}/${paperId}`
  return Object.hasOwn(answerKeys, label) ? answerKeys[label] : null
}
