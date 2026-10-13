import { useState } from 'react'
import {
  FaArrowLeft,
  FaCircleCheck,
  FaCircleDot,
  FaCircleMinus,
  FaCircleXmark,
  FaClock,
  FaFlagCheckered,
} from 'react-icons/fa6'
import QuestionFigure from './QuestionFigure'
import { getLanguage } from '../../data/examPapersData'
import { formatText, getPracticeText, pickText } from '../../data/examPracticeText'
import { finishReview, resumeAttempt } from '../../services/examApi'
import { formatDuration } from '../../utils/formatUtils'
import useCountdown from '../../utils/useCountdown'

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'

// How each outcome of a question is shown. The outcome comes from the backend, and only
// once the review is finished; until then a question is just answered or unanswered.
const outcomes = {
  answered: {
    label: 'statusAnswered',
    icon: FaCircleDot,
    badge: 'bg-brand-soft text-brand-dark ring-brand/20',
    border: 'border-l-brand',
  },
  correct: {
    label: 'statusCorrect',
    icon: FaCircleCheck,
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    border: 'border-l-emerald-500',
  },
  incorrect: {
    label: 'statusIncorrect',
    icon: FaCircleXmark,
    badge: 'bg-danger-soft text-danger-dark ring-danger/20',
    border: 'border-l-danger',
  },
  unanswered: {
    label: 'statusUnanswered',
    icon: FaCircleMinus,
    badge: 'bg-gray-100 text-gray-700 ring-gray-500/20',
    border: 'border-l-gray-400',
  },
}

// One question of the review: every option in the order of the attempt, with the
// student's choice marked. The correct answer and whether the choice was right are shown
// only when `isReviewFinalized` (after "Finish Review"); before that the backend does not
// send them. Options are matched by their permanent ids, never by where they are shown.
export function ReviewQuestion({
  question,
  total,
  language,
  sourceLanguage,
  text,
  isReviewFinalized = false,
}) {
  const outcome = isReviewFinalized
    ? question.outcome
    : question.selectedOptionId
      ? 'answered'
      : 'unanswered'
  const { label, icon: OutcomeIcon, badge, border } = outcomes[outcome]
  const questionText = pickText(question.text, language, sourceLanguage)

  return (
    <article
      data-outcome={outcome}
      className={`${cardClass} border-l-4 ${border}`}
      aria-label={formatText(text.questionOf, { current: question.number, total })}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-600">
          {formatText(text.questionOf, { current: question.number, total })}
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}
        >
          <OutcomeIcon aria-hidden="true" />
          {text[label]}
        </span>
      </div>

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <QuestionFigure question={question} text={text} />
        <p
          lang={getLanguage(questionText.language).htmlLang}
          className="text-lg leading-relaxed font-bold text-ink"
        >
          {questionText.value}
        </p>
      </div>

      <ol aria-label={text.answerOptions} className="mt-5 flex flex-col gap-2">
        {question.options.map((option, index) => {
          const optionText = pickText(option.text, language, sourceLanguage)
          const isCorrect = isReviewFinalized && option.id === question.correctOptionId
          const isSelected = option.id === question.selectedOptionId
          // A wrong choice is only shown as wrong once the review is finished; before
          // that every chosen option looks the same as it did during the attempt
          const isWrong = isReviewFinalized && isSelected && !isCorrect
          const style = isCorrect
            ? 'border-emerald-500 bg-emerald-50'
            : isWrong
              ? 'border-danger bg-danger-soft'
              : isSelected
                ? 'border-brand bg-brand-soft'
                : 'border-gray-200 bg-white'
          return (
            <li
              key={option.id}
              data-option-id={option.id}
              data-correct={isCorrect || undefined}
              data-selected={isSelected || undefined}
              className={`flex flex-wrap items-start gap-x-3 gap-y-1 rounded-xl border-2 px-4 py-2.5 ${style}`}
            >
              <span className="font-semibold text-gray-500">{index + 1}.</span>
              <span
                lang={getLanguage(optionText.language).htmlLang}
                className="min-w-0 flex-1 leading-relaxed text-gray-800"
              >
                {optionText.value}
              </span>
              <span className="flex flex-wrap gap-2">
                {isSelected && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isCorrect ? 'bg-emerald-600 text-white' : isWrong ? 'bg-danger text-white' : 'bg-brand text-white'}`}
                  >
                    {isReviewFinalized &&
                      (isCorrect ? (
                        <FaCircleCheck aria-hidden="true" />
                      ) : (
                        <FaCircleXmark aria-hidden="true" />
                      ))}
                    {text.yourAnswer}
                  </span>
                )}
                {isCorrect && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                    <FaCircleCheck aria-hidden="true" />
                    {text.correctAnswer}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </article>
  )
}

// A submitted attempt: the whole paper in the attempt's order for the student to read
// through. Nothing can be changed here.
//   "Back to Quiz"  - offered only after a manual submission, until the original deadline
//   "Finish Review" - makes the result final; `onFinished(result)` receives it
// `onAttempt(attempt)` receives the attempt when the student goes back to the quiz.
function ExamReview({ attempt, language, onAttempt, onFinished, onReload }) {
  const practiceText = getPracticeText(language)
  const { questions, sourceLanguage } = attempt
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const secondsLeft = useCountdown(attempt.remainingSeconds, attempt.serverNow)
  // The backend decides this again when the button is used; this only stops offering it
  const canReturn = attempt.canReturnToQuiz && secondsLeft > 0

  const run = async (action, work) => {
    setBusy(action)
    setError('')
    try {
      await work()
    } catch (actionError) {
      setError(actionError.message)
      // 409: what the page shows is out of date (for example the time ran out)
      if (actionError.status === 409) onReload()
    } finally {
      setBusy(null)
    }
  }

  const backToQuiz = () => run('back', async () => onAttempt(await resumeAttempt(attempt.id)))
  const finish = () => run('finish', async () => onFinished(await finishReview(attempt.id)))

  return (
    <>
      <section className={cardClass}>
        <h2 className="text-xl font-bold text-ink sm:text-2xl">{practiceText.reviewTitle}</h2>
        <p className="mt-1 text-gray-600">{practiceText.reviewIntro}</p>
        {attempt.submissionType === 'timeout' && (
          <p
            role="status"
            className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
          >
            <FaClock aria-hidden="true" className="mt-0.5 shrink-0" />
            {practiceText.reviewTimeout}
          </p>
        )}
      </section>

      <ol className="flex flex-col gap-4">
        {questions.map((question) => (
          <li key={question.id}>
            <ReviewQuestion
              question={question}
              total={questions.length}
              language={language}
              sourceLanguage={sourceLanguage}
              text={practiceText}
            />
          </li>
        ))}
      </ol>

      <section className={cardClass}>
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        <p className="mb-4 text-sm text-gray-600">
          {canReturn
            ? formatText(practiceText.backToQuizHint, { time: formatDuration(secondsLeft) })
            : practiceText.backToQuizExpired}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={backToQuiz}
            disabled={!canReturn || busy !== null}
            className="btn !rounded-lg border border-gray-300 bg-white !px-5 !py-2.5 text-ink hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaArrowLeft aria-hidden="true" />
            {busy === 'back' ? practiceText.pleaseWait : practiceText.backToQuiz}
          </button>
          <button
            type="button"
            onClick={finish}
            disabled={busy !== null}
            className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-wait disabled:opacity-70"
          >
            <FaFlagCheckered aria-hidden="true" />
            {busy === 'finish' ? practiceText.pleaseWait : practiceText.finishReview}
          </button>
        </div>
      </section>
    </>
  )
}

export default ExamReview
