// HTTP handling for the student exams. Rules live in services/examService.js.

import * as examPaperService from '../services/examPaperService.js'
import * as examService from '../services/examService.js'
import { sendSuccess } from '../utils/responseUtils.js'

export const list = async (req, res) => {
  const exams = await examService.listExams()
  sendSuccess(res, { message: 'Exam categories retrieved successfully', data: { exams } })
}

export const getDetails = async (req, res) => {
  const exam = await examService.getExam(req.params.examType)
  sendSuccess(res, {
    message: 'Exam category retrieved successfully. Exam questions will be added later.',
    data: { exam },
  })
}

export const listPapers = async (req, res) => {
  const result = await examPaperService.listPapers(req.params.examType)
  sendSuccess(res, { message: 'Exam papers retrieved successfully', data: result })
}

// Questions and answer options only: the correct answers are never part of this response
export const getPaperQuestions = async (req, res) => {
  const result = await examPaperService.getPaperQuestions(req.params.examType, req.params.paperId)
  sendSuccess(res, { message: 'Exam paper questions retrieved successfully', data: result })
}
