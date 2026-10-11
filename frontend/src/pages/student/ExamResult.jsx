import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCircleCheck,
  FaCircleMinus,
  FaCircleXmark,
  FaClock,
  FaGaugeHigh,
  FaPercent,
  FaRotateRight,
  FaSquarePollVertical,
} from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import { getLanguage } from '../../data/examPapersData'
import { getPracticeText, pickText } from '../../data/examPracticeText'
import { getAttemptResult } from '../../services/examApi'
import { formatDuration } from '../../utils/formatUtils'
import useExamLanguage from '../../utils/useExamLanguage'

const EXAMS_PATH = '/student-dashboard/exams'

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'
const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

// The final result of one finished attempt, read from the backend: it is the same after a
// refresh or a new login. Every number is the backend's; nothing is calculated here.
function ExamResult() {
  const { examType, paperId, attemptId } = useParams()
  const [language] = useExamLanguage()
  // Keyed by attempt, so one result is never shown for another
  const [loaded, setLoaded] = useState({ attemptId: null, result: null, error: null })

  useEffect(() => {
    let active = true
    getAttemptResult(attemptId)
      .then((result) => active && setLoaded({ attemptId, result, error: null }))
      .catch((error) => active && setLoaded({ attemptId, result: null, error }))
    return () => {
      active = false
    }
  }, [attemptId])

  const { result, error } = loaded.attemptId === attemptId ? loaded : { result: null, error: null }
  const text = getPracticeText(language)
  const htmlLang = getLanguage(language).htmlLang
  const paperPath = `${EXAMS_PATH}/${examType}/${paperId}`

  const backLink = (
    <Link
      to={`${EXAMS_PATH}/${examType}`}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      {text.backToPapers}
    </Link>
  )

  if (!result) {
    // 409: the attempt exists but its review has not been finished yet
    const title =
      error?.status === 409
        ? text.resultNotReady
        : error?.status === 404
          ? text.resultNotFound
          : text.resultLoadError
    return (
      <div lang={htmlLang} className="flex flex-col gap-6">
        {backLink}
        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">{title}</p>
            {error.status === 409 ? (
              <Link to={paperPath} className="btn btn-primary mt-5 !rounded-lg !px-5 !py-2">
                {text.goToPaper}
              </Link>
            ) : (
              error.status !== 404 && <p className="mt-1 text-sm">{error.message}</p>
            )}
          </div>
        ) : (
          <p role="status" className={noticeClass}>
            {text.pleaseWait}
          </p>
        )}
      </div>
    )
  }

  const paperTitle = pickText(result.paper.title, language, 'en').value
  const timeExpired = result.completionStatus === 'time_expired'

  const counts = [
    {
      key: 'correct',
      label: text.correctAnswers,
      value: result.correct,
      icon: FaCircleCheck,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      key: 'incorrect',
      label: text.incorrectAnswers,
      value: result.incorrect,
      icon: FaCircleXmark,
      className: 'border-brand/20 bg-brand-soft text-brand-dark',
    },
    {
      key: 'unanswered',
      label: text.unansweredQuestions,
      value: result.unanswered,
      icon: FaCircleMinus,
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    },
  ]

  const details = [
    { key: 'percentage', label: text.percentage, value: `${result.percentage}%`, icon: FaPercent },
    {
      key: 'timeTaken',
      label: text.timeTaken,
      value: formatDuration(result.timeTakenSeconds),
      icon: FaClock,
    },
    { key: 'total', label: text.totalQuestions, value: result.totalQuestions, icon: FaSquarePollVertical },
  ]

  return (
    <div lang={htmlLang} className="flex flex-col gap-6">
      {backLink}
      <DashboardWelcome
        title={text.resultTitle}
        message={`${result.exam.title} – ${paperTitle}`}
        icon={FaSquarePollVertical}
      />

      <section className={`${cardClass} text-center sm:p-8`}>
        <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
          {text.marksLabel}
        </p>
        <p data-result="marks" className="mt-2 text-5xl font-extrabold text-ink sm:text-6xl">
          {result.marks}
          <span className="text-3xl font-bold text-gray-400 sm:text-4xl"> / {result.totalQuestions}</span>
        </p>
        <p className="mt-4">
          <span className="mr-2 text-sm text-gray-600">{text.statusLabel}:</span>
          <span
            data-result="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${
              timeExpired
                ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
            }`}
          >
            {timeExpired ? <FaClock aria-hidden="true" /> : <FaCircleCheck aria-hidden="true" />}
            {timeExpired ? text.statusTimeExpired : text.statusCompleted}
          </span>
        </p>
      </section>

      <dl className="grid gap-4 sm:grid-cols-3">
        {counts.map(({ key, label, value, icon: Icon, className }) => (
          <div key={key} className={`rounded-2xl border p-5 shadow-sm ${className}`}>
            <dt className="flex items-center gap-2 font-semibold">
              <Icon aria-hidden="true" />
              {label}
            </dt>
            <dd data-result={key} className="mt-2 text-4xl font-extrabold">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="grid gap-4 sm:grid-cols-3">
        {details.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className={cardClass}>
            <dt className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Icon aria-hidden="true" className="text-brand" />
              {label}
            </dt>
            <dd data-result={key} className="mt-2 text-2xl font-extrabold text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          to={paperPath}
          className="btn !rounded-lg border border-gray-300 bg-white !px-5 !py-2.5 text-ink hover:border-brand hover:text-brand"
        >
          <FaRotateRight aria-hidden="true" />
          {text.startNewAttempt}
        </Link>
        <Link to="/student-dashboard" className="btn btn-primary !rounded-lg !px-6 !py-2.5">
          <FaGaugeHigh aria-hidden="true" />
          {text.backToDashboard}
        </Link>
      </div>
    </div>
  )
}

export default ExamResult
