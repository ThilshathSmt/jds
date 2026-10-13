import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCircleInfo,
  FaClock,
  FaFileCircleCheck,
  FaHourglassHalf,
  FaListOl,
  FaPlay,
} from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ExamAttempt from '../../components/exam/ExamAttempt'
import ExamReview from '../../components/exam/ExamReview'
import LanguageSelector from '../../components/exam/LanguageSelector'
import { getLanguage, getTranslation, languages } from '../../data/examPapersData'
import { formatText, getPracticeText, pickText } from '../../data/examPracticeText'
import { getPaperState, startAttempt } from '../../services/examApi'
import useExamLanguage from '../../utils/useExamLanguage'

const EXAMS_PATH = '/student-dashboard/exams'

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'
const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

// Confirmation before an attempt: what the exam is and how long it lasts. The timer only
// starts when "Start Attempt" is pressed (the backend records the start time then).
function StartScreen({ exam, paper, paperTitle, lastResult, text, onStart, cancelTo, resultTo }) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const start = async () => {
    setStarting(true)
    setError('')
    try {
      await onStart()
    } catch (startError) {
      setError(startError.message)
      setStarting(false)
    }
  }

  const details = [
    { label: text.examLabel, value: `${exam.title} – ${paperTitle}`, icon: FaFileCircleCheck },
    { label: text.totalQuestions, value: paper.questionCount, icon: FaListOl },
    {
      label: text.duration,
      value: formatText(text.minutes, { count: paper.durationMinutes }),
      icon: FaClock,
    },
  ]

  return (
    <section className={`${cardClass} sm:p-8`}>
      <dl className="grid gap-4 sm:grid-cols-3">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
            <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <Icon aria-hidden="true" className="text-brand" />
              {label}
            </dt>
            <dd className="mt-1 font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-brand-dark">
        <FaCircleInfo aria-hidden="true" className="mt-1 shrink-0" />
        {text.startInstruction}
      </p>

      {lastResult && (
        <p className="mt-4 text-sm text-gray-600">
          {formatText(text.lastResult, { marks: lastResult.marks, total: lastResult.totalQuestions })}
          {' · '}
          <Link to={resultTo(lastResult.attemptId)} className="font-semibold text-brand hover:underline">
            {text.viewResult}
          </Link>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link
          to={cancelTo}
          className="btn !rounded-lg bg-gray-200 !px-5 !py-2.5 text-ink hover:bg-gray-300"
        >
          {text.cancel}
        </Link>
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className="btn btn-primary !rounded-lg !px-6 !py-2.5 disabled:cursor-wait disabled:opacity-70"
        >
          <FaPlay aria-hidden="true" />
          {starting ? text.starting : text.startAttempt}
        </button>
      </div>
    </section>
  )
}

// One exam paper. What is shown follows the state the backend holds for this student, so
// refreshing, leaving and coming back always lead to the same place:
//   no unfinished attempt -> start confirmation
//   attempt in progress   -> the questions with the countdown
//   attempt submitted     -> the review; finishing it opens the result page
function ExamPaper() {
  const { examType, paperId } = useParams()
  const navigate = useNavigate()
  const paperKey = `${examType}/${paperId}`
  const [language, setLanguage] = useExamLanguage()
  // Keyed by paper, so one paper's state is never shown for another
  const [loaded, setLoaded] = useState({ paperKey: null, state: null, error: null })

  // Counts every change of what is shown. A refresh that was requested before a newer
  // change (for example before the attempt was submitted) is out of date when it arrives
  // and is dropped, so an old answer from the backend can never replace a newer one.
  const version = useRef(0)

  // Fetches the paper state again without blanking the page
  const reload = useCallback(() => {
    version.current += 1
    const requested = version.current
    return (
      getPaperState(examType, paperId)
        .then((state) => {
          if (version.current === requested) setLoaded({ paperKey, state, error: null })
        })
        // A failed refresh keeps what is on screen; only a first load shows the error
        .catch((error) => {
          if (version.current !== requested) return
          setLoaded((current) =>
            current.paperKey === paperKey && current.state ? current : { paperKey, state: null, error },
          )
        })
    )
  }, [examType, paperId, paperKey])

  useEffect(() => {
    reload()
  }, [reload])

  const { state, error } = loaded.paperKey === paperKey ? loaded : { state: null, error: null }
  // The result of an action (start, submit, back to quiz) is always the newest state
  const setAttempt = (attempt) => {
    version.current += 1
    setLoaded((current) => ({ ...current, state: { ...current.state, attempt } }))
  }

  const text = getTranslation(language)
  const practiceText = getPracticeText(language)
  const htmlLang = getLanguage(language).htmlLang
  const papersPath = `${EXAMS_PATH}/${examType}`
  const resultPath = (attemptId) => `${papersPath}/${paperId}/results/${attemptId}`

  const backLink = (
    <Link
      to={papersPath}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      {practiceText.backToPapers}
    </Link>
  )

  if (!state) {
    const notFound = error?.status === 404
    return (
      <div lang={htmlLang} className="flex flex-col gap-6">
        {backLink}
        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">
              {notFound ? practiceText.notFoundTitle : practiceText.loadError}
            </p>
            <p className="mt-1 text-sm">{notFound ? practiceText.notFoundText : error.message}</p>
          </div>
        ) : (
          <p role="status" className={noticeClass}>
            {practiceText.loading}
          </p>
        )}
      </div>
    )
  }

  const { exam, paper, attempt, lastResult, contentLanguages } = state
  const paperTitle = pickText(paper.title, language, 'en').value
  const hasQuestions = paper.questionCount > 0
  // The interface follows the chosen language; untranslated questions stay in their source language
  const translationPending = hasQuestions && !contentLanguages.includes(language)

  return (
    <div lang={htmlLang} className="flex flex-col gap-6">
      {backLink}
      {attempt?.status === 'in_progress' ? (
        // A slim title while the timer runs, so the question is on screen without scrolling
        <h1 className="flex items-center gap-3 text-xl font-extrabold text-ink sm:text-2xl">
          <FaFileCircleCheck aria-hidden="true" className="shrink-0 text-brand" />
          {exam.title} – {paperTitle}
        </h1>
      ) : (
        <DashboardWelcome title={exam.title} message={paperTitle} icon={FaFileCircleCheck} />
      )}

      <section className={`${cardClass} flex flex-col gap-5`}>
        <LanguageSelector
          languages={languages}
          selected={language}
          onChange={setLanguage}
          label={text.languageLabel}
        />
        {translationPending && (
          <p
            role="note"
            className="flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0" />
            {formatText(practiceText.translationPending, { language: getLanguage(language).label })}
          </p>
        )}
      </section>

      {!hasQuestions ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl text-brand">
            <FaHourglassHalf aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-ink">{paperTitle}</h2>
          <p className="mt-2 text-gray-600">{practiceText.noQuestions}</p>
        </section>
      ) : !attempt ? (
        <StartScreen
          exam={exam}
          paper={paper}
          paperTitle={paperTitle}
          lastResult={lastResult}
          text={practiceText}
          onStart={async () => setAttempt(await startAttempt(examType, paperId))}
          cancelTo={papersPath}
          resultTo={resultPath}
        />
      ) : attempt.status === 'in_progress' ? (
        <ExamAttempt
          key={attempt.id}
          attempt={attempt}
          language={language}
          onAttempt={setAttempt}
          onReload={reload}
        />
      ) : (
        <ExamReview
          attempt={attempt}
          language={language}
          onAttempt={setAttempt}
          onFinished={(result) => navigate(resultPath(result.attemptId))}
          onReload={reload}
        />
      )}
    </div>
  )
}

export default ExamPaper
