// HTTP handling for timed exam attempts. Rules live in services/examAttemptService.js.
// The attempt always belongs to req.user: the student id never comes from the request.

import * as examAttemptService from '../services/examAttemptService.js'
import { sendSuccess } from '../utils/responseUtils.js'
import { parseId, validateAnswerInput } from '../utils/validationUtils.js'

// GET /exams/:examType/papers/:paperId/attempt
export const getPaperState = async (req, res) => {
  const state = await examAttemptService.getPaperState(
    req.params.examType,
    req.params.paperId,
    req.user.id,
  )
  sendSuccess(res, { message: 'Exam paper state retrieved successfully', data: state })
}

// POST /exams/:examType/papers/:paperId/attempts
export const start = async (req, res) => {
  const { created, attempt } = await examAttemptService.start(
    req.params.examType,
    req.params.paperId,
    req.user.id,
  )
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Attempt started' : 'You already have an unfinished attempt at this paper',
    data: { attempt },
  })
}

export const getAttempt = async (req, res) => {
  const attempt = await examAttemptService.getAttempt(parseId(req.params.attemptId), req.user.id)
  sendSuccess(res, { message: 'Attempt retrieved successfully', data: { attempt } })
}

export const saveAnswer = async (req, res) => {
  const saved = await examAttemptService.saveAnswer(parseId(req.params.attemptId), req.user.id, {
    questionId: req.params.questionId,
    ...validateAnswerInput(req.body),
  })
  sendSuccess(res, { message: 'Answer saved', data: saved })
}

export const submit = async (req, res) => {
  const attempt = await examAttemptService.submit(parseId(req.params.attemptId), req.user.id)
  sendSuccess(res, { message: 'Attempt submitted', data: { attempt } })
}

export const resume = async (req, res) => {
  const attempt = await examAttemptService.resume(parseId(req.params.attemptId), req.user.id)
  sendSuccess(res, { message: 'You are back in the quiz', data: { attempt } })
}

export const finishReview = async (req, res) => {
  const result = await examAttemptService.finishReview(
    parseId(req.params.attemptId),
    req.user.id,
  )
  sendSuccess(res, { message: 'Review finished', data: { result } })
}

export const getResult = async (req, res) => {
  const result = await examAttemptService.getResult(parseId(req.params.attemptId), req.user.id)
  sendSuccess(res, { message: 'Result retrieved successfully', data: { result } })
}
