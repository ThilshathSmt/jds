import { useCallback, useEffect, useRef, useState } from 'react'
import { FaArrowLeft, FaArrowRight, FaFlagCheckered, FaTriangleExclamation } from 'react-icons/fa6'
import ExamQuestion from './ExamQuestion'
import ExamTimer from './ExamTimer'
import ConfirmDialog from '../admin/ConfirmDialog'
import { formatText, getPracticeText } from '../../data/examPracticeText'
import { saveAnswer, submitAttempt } from '../../services/examApi'
import useCountdown from '../../utils/useCountdown'

const RETRY_MS = 4000
const TIME_UP_POLL_MS = 2000

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'
const secondaryButton =
  'btn !rounded-lg border border-gray-300 bg-white !px-5 !py-2.5 text-ink hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40'

// An attempt in progress: one question at a time, in the order the backend gave this
// attempt, with the countdown. Every choice is saved to the backend straight away, so a
// refresh or a lost connection loses nothing that was saved.
// `onAttempt(attempt)` receives the attempt after it is submitted; `onReload()` asks the
// page to fetch the attempt again (used when the backend says it is no longer in progress).
function ExamAttempt({ attempt, language, onAttempt, onReload }) {
  const practiceText = getPracticeText(language)
  const { questions, sourceLanguage } = attempt
  const total = questions.length

  const [answers, setAnswers] = useState(attempt.answers)
  // Coming back to an attempt opens it at the first question still unanswered
  const [index, setIndex] = useState(() =>
    Math.max(0, questions.findIndex((question) => !attempt.answers[question.id])),
  )
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Questions whose latest answer has not reached the backend yet (connection problems)
  const [unsavedCount, setUnsavedCount] = useState(0)
  const unsaved = useRef(new Set())
  const latestAnswers = useRef(attempt.answers)
  // One queue per question, so two quick changes can never be saved in the wrong order
  const queues = useRef({})

  const secondsLeft = useCountdown(attempt.remainingSeconds, attempt.serverNow)
  const timeUp = secondsLeft <= 0

  const markUnsaved = (questionId, isUnsaved) => {
    if (isUnsaved) unsaved.current.add(questionId)
    else unsaved.current.delete(questionId)
    setUnsavedCount(unsaved.current.size)
  }

  // Sends the current answer of a question, after any earlier save of it has finished
  const queueSave = useCallback(
    (questionId) => {
      const send = async () => {
        const optionId = latestAnswers.current[questionId]
        try {
          await saveAnswer(attempt.id, questionId, optionId)
          if (latestAnswers.current[questionId] === optionId) markUnsaved(questionId, false)
        } catch (saveError) {
          // 409: the attempt was submitted or its time ran out. The page shows what it is now.
          if (saveError.status === 409) onReload()
          else if (saveError.status === 0 || saveError.status >= 500) markUnsaved(questionId, true)
          else setError(saveError.message)
        }
      }
      queues.current[questionId] = (queues.current[questionId] ?? Promise.resolve()).then(send)
      return queues.current[questionId]
    },
    [attempt.id, onReload],
  )

  const select = (questionId, optionId) => {
    if (timeUp || busy) return
    latestAnswers.current = { ...latestAnswers.current, [questionId]: optionId }
    setAnswers(latestAnswers.current)
    setError('')
    queueSave(questionId)
  }

  // Keep trying to save what could not be saved
  useEffect(() => {
    if (unsavedCount === 0 || timeUp) return undefined
    const timer = setTimeout(() => [...unsaved.current].forEach(queueSave), RETRY_MS)
    return () => clearTimeout(timer)
  }, [unsavedCount, timeUp, queueSave])

  // At zero the backend submits the attempt itself; ask for it until it says so
  useEffect(() => {
    if (!timeUp) return undefined
    onReload()
    const timer = setInterval(onReload, TIME_UP_POLL_MS)
    return () => clearInterval(timer)
  }, [timeUp, onReload])

  // Returning to the tab or coming back online: take the time left from the backend again
  useEffect(() => {
    const resync = () => document.visibilityState === 'visible' && onReload()
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('online', resync)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('online', resync)
    }
  }, [onReload])

  const finish = async () => {
    setBusy(true)
    setError('')
    try {
      // Everything chosen must be saved before the attempt is submitted
      await Promise.allSettled(Object.values(queues.current))
      await Promise.allSettled([...unsaved.current].map(queueSave))
      if (unsaved.current.size > 0) {
        setError(practiceText.unsavedBlock)
        return
      }
      onAttempt(await submitAttempt(attempt.id))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  const answeredCount = questions.filter((question) => answers[question.id]).length
  const question = questions[index]
  const isLast = index === total - 1

  return (
    <>
      <div className="sticky top-[4.5rem] z-30">
        <ExamTimer secondsLeft={secondsLeft} text={practiceText} />
      </div>

      {unsavedCount > 0 && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <FaTriangleExclamation aria-hidden="true" className="mt-0.5 shrink-0" />
          {practiceText.unsavedWarning}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className={cardClass}>
          <div className="mb-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-semibold text-ink" aria-live="polite">
                {formatText(practiceText.questionOf, { current: index + 1, total })}
              </p>
              <p className="text-gray-600">
                {formatText(practiceText.answeredCount, { count: answeredCount, total })}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={practiceText.progress}
              aria-valuenow={index + 1}
              aria-valuemin={1}
              aria-valuemax={total}
              className="h-2.5 overflow-hidden rounded-full bg-gray-200"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          <p className="mb-5 text-sm text-gray-600">{practiceText.instruction}</p>

          <ExamQuestion
            key={question.id}
            question={question}
            total={total}
            language={language}
            sourceLanguage={sourceLanguage}
            text={practiceText}
            selectedOptionId={answers[question.id]}
            onSelect={(optionId) => select(question.id, optionId)}
            disabled={timeUp || busy}
          />

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              disabled={index === 0}
              className={secondaryButton}
            >
              <FaArrowLeft aria-hidden="true" />
              {practiceText.previous}
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={timeUp || busy}
                className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaFlagCheckered aria-hidden="true" />
                {practiceText.finishAttempt}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex(index + 1)}
                className="btn btn-primary !rounded-lg !px-5 !py-2.5"
              >
                {practiceText.next}
                <FaArrowRight aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        <nav aria-label={practiceText.questionList} className={cardClass}>
          <h2 className="mb-4 font-bold text-ink">{practiceText.questionList}</h2>
          <ol className="grid grid-cols-5 gap-2">
            {questions.map((item, itemIndex) => {
              const current = itemIndex === index
              const answered = Boolean(answers[item.id])
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`${formatText(practiceText.goToQuestion, { number: item.number })} (${answered ? practiceText.answered : practiceText.notAnswered})`}
                    className={`flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border-2 text-sm font-bold transition ${
                      current
                        ? 'border-brand bg-brand text-white'
                        : answered
                          ? 'border-brand/40 bg-brand-soft text-brand-dark hover:border-brand'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-brand/40'
                    }`}
                  >
                    {item.number}
                  </button>
                </li>
              )
            })}
          </ol>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border-2 border-brand/40 bg-brand-soft" aria-hidden="true" />
              {practiceText.answered}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border-2 border-gray-200 bg-white" aria-hidden="true" />
              {practiceText.notAnswered}
            </li>
          </ul>
        </nav>
      </div>

      {confirming && (
        <ConfirmDialog
          title={practiceText.finishConfirmTitle}
          message={formatText(practiceText.finishConfirmMessage, { count: answeredCount, total })}
          confirmLabel={practiceText.finishAttempt}
          cancelLabel={practiceText.cancel}
          busyLabel={practiceText.pleaseWait}
          busy={busy}
          onConfirm={finish}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}

export default ExamAttempt
