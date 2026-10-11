// Business rules for timed exam attempts: starting, answering, submitting, reviewing and
// the final result.
//
//   in_progress -> submitted (review) -> completed (result)
//
// What the server alone decides, whatever a browser sends:
//   - the start time and deadline, and therefore whether an answer is still accepted
//   - the order of questions and options (shuffled once, when the attempt starts)
//   - which answers are correct, and the score
// An attempt whose deadline has passed is submitted the next time anything touches it, as
// if it had been submitted at the deadline, so closing the browser changes nothing.
// Correct answers are only ever sent once an attempt has been submitted.
//
// Every function takes `now` last. Callers leave it out; tests pass a fixed time.

import { withTransaction } from '../config/database.js'
import { SOURCE_LANGUAGE } from '../data/examPapers/index.js'
import * as examAttemptModel from '../models/examAttemptModel.js'
import * as examPaperModel from '../models/examPaperModel.js'
import AppError from '../utils/AppError.js'
import { shuffle } from '../utils/shuffleUtils.js'
import { getContentLanguages, toPaperSummary } from './examPaperService.js'
import { getExam } from './examService.js'

const NOT_FOUND = 'Exam attempt not found.'
const LOCKED = 'This attempt has been submitted. Answers can no longer be changed.'

const loadExamAndPaper = async (examType, paperId) => {
  const exam = await getExam(examType)
  const paper = await examPaperModel.findPaper(exam.id, paperId)
  if (!paper) throw new AppError(404, 'Exam paper not found.')
  return { exam, paper }
}

const isExpired = (attempt, now) => now.getTime() >= attempt.deadline_at.getTime()

// Counts the outcome of every question of the attempt against the answer key.
// Always: correct + incorrect + unanswered = number of questions.
const score = (attempt, answers, answerKey) => {
  const counts = { correctCount: 0, incorrectCount: 0, unansweredCount: 0 }
  for (const { q: questionId } of attempt.question_order) {
    if (!answers[questionId]) counts.unansweredCount += 1
    else if (answers[questionId] === answerKey[questionId]) counts.correctCount += 1
    else counts.incorrectCount += 1
  }
  return counts
}

// Submits the attempt: scores it and records the answer key used, so the result stays
// the same even if the paper is corrected later. Returns the attempt as it is now.
const finalize = async (attempt, { submissionType, submittedAt }, db) => {
  const answers = await examAttemptModel.findAnswers(attempt.id, db)
  const fullKey = (await examPaperModel.findAnswerKey(attempt.exam_id, attempt.paper_id)) ?? {}
  const answerKey = Object.fromEntries(
    attempt.question_order.map(({ q }) => [q, fullKey[q] ?? null]),
  )
  const counts = score(attempt, answers, answerKey)

  await examAttemptModel.markSubmitted(
    attempt.id,
    { submissionType, submittedAt, answerKey, ...counts },
    db,
  )
  return {
    ...attempt,
    status: 'submitted',
    submission_type: submissionType,
    submitted_at: submittedAt,
    answer_key: answerKey,
    correct_count: counts.correctCount,
    incorrect_count: counts.incorrectCount,
    unanswered_count: counts.unansweredCount,
  }
}

// Locks the student's attempt, submits it first if its time has run out, then runs
// `work(attempt, db)`. To refuse the request, `work` returns { reject: AppError } instead
// of throwing: the transaction still commits, so an automatic submission is never undone
// by the refusal that follows it.
const withAttempt = async (attemptId, userId, now, work = () => ({})) => {
  const result = await withTransaction(async (db) => {
    let attempt = await examAttemptModel.findOwned(attemptId, userId, db, { forUpdate: true })
    // The same answer for "does not exist" and "belongs to someone else"
    if (!attempt) return { reject: new AppError(404, NOT_FOUND) }
    if (attempt.status === 'in_progress' && isExpired(attempt, now)) {
      attempt = await finalize(
        attempt,
        { submissionType: 'timeout', submittedAt: attempt.deadline_at },
        db,
      )
    }
    return work(attempt, db)
  })
  if (result?.reject) throw result.reject
  return result
}

const toResult = (attempt, exam, paper) => ({
  attemptId: attempt.id,
  exam: { id: exam.id, title: exam.title },
  paper: toPaperSummary(paper),
  totalQuestions: attempt.total_questions,
  correct: attempt.correct_count,
  incorrect: attempt.incorrect_count,
  unanswered: attempt.unanswered_count,
  // One mark per question, no negative marking
  marks: attempt.correct_count,
  percentage: Math.round((attempt.correct_count / attempt.total_questions) * 1000) / 10,
  timeTakenSeconds: Math.min(
    attempt.duration_seconds,
    Math.max(0, Math.round((attempt.submitted_at - attempt.started_at) / 1000)),
  ),
  completionStatus: attempt.submission_type === 'timeout' ? 'time_expired' : 'completed',
  startedAt: attempt.started_at,
  submittedAt: attempt.submitted_at,
  completedAt: attempt.completed_at,
})

// What the student is shown of an attempt. Built field by field: while the attempt is in
// progress nothing about correct answers is included.
const toView = async (attempt, now) => {
  const { exam, paper } = await loadExamAndPaper(attempt.exam_id, attempt.paper_id)
  const answers = await examAttemptModel.findAnswers(attempt.id)
  const questionsById = new Map(paper.questions.map((question) => [question.id, question]))
  const inProgress = attempt.status === 'in_progress'

  // The attempt's own order of questions and options; `number` is the position in it
  const questions = attempt.question_order
    .filter(({ q }) => questionsById.has(q))
    .map(({ q: questionId, o: optionIds }, index) => {
      const question = questionsById.get(questionId)
      const optionsById = new Map(question.options.map((option) => [option.id, option]))
      const shown = {
        id: question.id,
        number: index + 1,
        imageUrl: question.imageUrl,
        imageAlt: question.imageAlt,
        text: question.text,
        options: optionIds
          .filter((optionId) => optionsById.has(optionId))
          .map((optionId) => ({ id: optionId, text: optionsById.get(optionId).text })),
      }
      if (inProgress) return shown

      const selectedOptionId = answers[questionId] ?? null
      const correctOptionId = attempt.answer_key[questionId] ?? null
      return {
        ...shown,
        selectedOptionId,
        correctOptionId,
        outcome: !selectedOptionId
          ? 'unanswered'
          : selectedOptionId === correctOptionId
            ? 'correct'
            : 'incorrect',
      }
    })

  const view = {
    id: attempt.id,
    status: attempt.status,
    exam: { id: exam.id, title: exam.title },
    paper: toPaperSummary(paper),
    sourceLanguage: SOURCE_LANGUAGE,
    contentLanguages: getContentLanguages(paper.questions),
    totalQuestions: attempt.total_questions,
    durationSeconds: attempt.duration_seconds,
    startedAt: attempt.started_at,
    deadlineAt: attempt.deadline_at,
    // The browser counts down from these two, not from its own clock
    serverNow: now,
    remainingSeconds: Math.max(0, Math.ceil((attempt.deadline_at - now) / 1000)),
    questions,
  }
  if (inProgress) return { ...view, answers }

  return {
    ...view,
    submissionType: attempt.submission_type,
    submittedAt: attempt.submitted_at,
    canReturnToQuiz:
      attempt.status === 'submitted' &&
      attempt.submission_type === 'manual' &&
      !isExpired(attempt, now),
    result: attempt.status === 'completed' ? toResult(attempt, exam, paper) : null,
  }
}

const loadView = async (attemptId, userId, now) =>
  toView(await examAttemptModel.findOwned(attemptId, userId), now)

// The start screen and the way back into an unfinished attempt: the paper, the student's
// unfinished attempt at it (if any) and their most recent result (if any).
export const getPaperState = async (examType, paperId, userId, now = new Date()) => {
  const { exam, paper } = await loadExamAndPaper(examType, paperId)
  const active = await examAttemptModel.findActive(userId, exam.id, paper.id)
  if (active) await withAttempt(active.id, userId, now)
  const latest = await examAttemptModel.findLatestCompleted(userId, exam.id, paper.id)

  return {
    exam: { id: exam.id, title: exam.title },
    paper: toPaperSummary(paper),
    sourceLanguage: SOURCE_LANGUAGE,
    contentLanguages: getContentLanguages(paper.questions),
    attempt: active ? await loadView(active.id, userId, now) : null,
    lastResult: latest ? toResult(latest, exam, paper) : null,
  }
}

// Starts an attempt: shuffles the questions and, separately, each question's options, and
// fixes the deadline. A student with an unfinished attempt at the paper gets that attempt
// back unchanged instead of a new one, so refreshing or clicking twice cannot reset the timer.
export const start = async (examType, paperId, userId, now = new Date()) => {
  const { exam, paper } = await loadExamAndPaper(examType, paperId)
  if (paper.questions.length === 0) {
    throw new AppError(409, 'This paper has no questions yet.')
  }

  const findExisting = () => examAttemptModel.findActive(userId, exam.id, paper.id)
  let existing = await findExisting()
  if (!existing) {
    const durationSeconds = paper.durationMinutes * 60
    try {
      const attemptId = await examAttemptModel.create({
        userId,
        examId: exam.id,
        paperId: paper.id,
        questionOrder: shuffle(paper.questions).map((question) => ({
          q: question.id,
          o: shuffle(question.options.map((option) => option.id)),
        })),
        totalQuestions: paper.questions.length,
        durationSeconds,
        startedAt: now,
        deadlineAt: new Date(now.getTime() + durationSeconds * 1000),
      })
      return { created: true, attempt: await loadView(attemptId, userId, now) }
    } catch (error) {
      // Two start requests at the same moment: the UNIQUE key let only one through
      if (error.code !== 'ER_DUP_ENTRY') throw error
      existing = await findExisting()
      if (!existing) throw error
    }
  }

  await withAttempt(existing.id, userId, now)
  return { created: false, attempt: await loadView(existing.id, userId, now) }
}

export const getAttempt = async (attemptId, userId, now = new Date()) => {
  await withAttempt(attemptId, userId, now)
  return loadView(attemptId, userId, now)
}

// Saves the option chosen for one question. Refused once the attempt is submitted or its
// time is up, and for anything that is not a question / option of this attempt.
export const saveAnswer = async (attemptId, userId, { questionId, optionId }, now = new Date()) =>
  withAttempt(attemptId, userId, now, async (attempt, db) => {
    if (attempt.status !== 'in_progress') {
      const expired = attempt.submission_type === 'timeout'
      return {
        reject: new AppError(409, expired ? 'The time for this attempt has ended.' : LOCKED),
      }
    }
    const entry = attempt.question_order.find(({ q }) => q === questionId)
    if (!entry) return { reject: new AppError(400, 'This question is not part of the attempt.') }
    if (!entry.o.includes(optionId)) {
      return { reject: new AppError(400, 'This is not one of the options of the question.') }
    }

    await examAttemptModel.saveAnswer(
      { attemptId: attempt.id, questionId, optionId, answeredAt: now },
      db,
    )
    return {
      questionId,
      optionId,
      remainingSeconds: Math.max(0, Math.ceil((attempt.deadline_at - now) / 1000)),
    }
  })

// "Finish Attempt". Submitting an attempt that is already submitted changes nothing, so a
// double click or a repeated request cannot score it twice.
export const submit = async (attemptId, userId, now = new Date()) => {
  await withAttempt(attemptId, userId, now, async (attempt, db) => {
    if (attempt.status === 'in_progress') {
      await finalize(attempt, { submissionType: 'manual', submittedAt: now }, db)
    }
    return {}
  })
  return loadView(attemptId, userId, now)
}

// "Back to Quiz": only after a manual submission and only while the original deadline
// has not passed. The start time and deadline are not touched: no extra time is given.
export const resume = async (attemptId, userId, now = new Date()) => {
  await withAttempt(attemptId, userId, now, async (attempt, db) => {
    if (attempt.status === 'in_progress') return {}
    if (attempt.status === 'completed') {
      return { reject: new AppError(409, 'This attempt is finished and cannot be reopened.') }
    }
    if (attempt.submission_type !== 'manual' || isExpired(attempt, now)) {
      return {
        reject: new AppError(409, 'The time for this attempt has ended. You cannot go back to the quiz.'),
      }
    }
    await examAttemptModel.reopen(attempt.id, db)
    return {}
  })
  return loadView(attemptId, userId, now)
}

// "Finish Review": the result becomes final. Repeating it returns the same result.
export const finishReview = async (attemptId, userId, now = new Date()) => {
  await withAttempt(attemptId, userId, now, async (attempt, db) => {
    if (attempt.status === 'in_progress') {
      return { reject: new AppError(409, 'Finish the attempt before finishing the review.') }
    }
    if (attempt.status === 'submitted') await examAttemptModel.markCompleted(attempt.id, now, db)
    return {}
  })
  return getResult(attemptId, userId, now)
}

export const getResult = async (attemptId, userId, now = new Date()) => {
  await withAttempt(attemptId, userId, now)
  const attempt = await examAttemptModel.findOwned(attemptId, userId)
  if (attempt.status !== 'completed') {
    throw new AppError(409, 'The result is available after the review is finished.')
  }
  const { exam, paper } = await loadExamAndPaper(attempt.exam_id, attempt.paper_id)
  return toResult(attempt, exam, paper)
}
