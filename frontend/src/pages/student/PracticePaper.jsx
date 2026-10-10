import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaArrowRight,
  FaCircleCheck,
  FaCircleInfo,
  FaFileCircleCheck,
  FaFlagCheckered,
  FaHourglassHalf,
} from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import LanguageSelector from '../../components/exam/LanguageSelector'
import PracticeQuestion from '../../components/exam/PracticeQuestion'
import { getLanguage, getTranslation, languages } from '../../data/examPapersData'
import { formatText, getPracticeText, pickText } from '../../data/examPracticeText'
import { getPaperQuestions } from '../../services/examApi'
import useExamLanguage from '../../utils/useExamLanguage'

const EXAMS_PATH = '/student-dashboard/exams'

const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6'
const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'
const secondaryButton =
  'btn !rounded-lg border border-gray-300 bg-white !px-5 !py-2.5 text-ink hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40'

// A practice paper: one question at a time, with free movement between questions.
// Answers are kept in this page only ({ questionId: optionId }) and are lost on leaving:
// nothing is submitted, scored or saved yet, and the page never receives the correct answers.
// TODO: Send the answers to the backend for scoring in the next phase
function PracticePaper() {
  const { examType, paperId } = useParams()
  const paperKey = `${examType}/${paperId}`
  const [language, setLanguage] = useExamLanguage()
  // Everything is keyed by paper, so answers can never carry over to another paper
  const [loaded, setLoaded] = useState({ paperKey: null, data: null, error: null })
  const [progress, setProgress] = useState({ paperKey: null, index: 0, answers: {}, finished: false })

  useEffect(() => {
    let active = true
    getPaperQuestions(examType, paperId)
      .then((data) => active && setLoaded({ paperKey, data, error: null }))
      .catch((error) => active && setLoaded({ paperKey, data: null, error }))
    return () => {
      active = false
    }
  }, [examType, paperId, paperKey])

  const { data, error } = loaded.paperKey === paperKey ? loaded : { data: null, error: null }
  const { index, answers, finished } =
    progress.paperKey === paperKey ? progress : { index: 0, answers: {}, finished: false }
  const update = (changes) => setProgress({ paperKey, index, answers, finished, ...changes })

  const text = getTranslation(language)
  const practiceText = getPracticeText(language)
  const htmlLang = getLanguage(language).htmlLang

  const backLink = (
    <Link
      to={`${EXAMS_PATH}/${examType}`}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      {practiceText.backToPapers}
    </Link>
  )

  if (!data) {
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

  const { exam, paper, questions, sourceLanguage, contentLanguages } = data
  const total = questions.length
  const paperTitle = pickText(paper.title, language, 'en').value
  const answeredCount = questions.filter((question) => answers[question.id]).length
  const question = questions[index]
  const isLast = index === total - 1
  // The interface follows the chosen language; untranslated questions stay in their source language
  const translationPending = total > 0 && !contentLanguages.includes(language)

  return (
    <div lang={htmlLang} className="flex flex-col gap-6">
      {backLink}
      <DashboardWelcome title={exam.title} message={paperTitle} icon={FaFileCircleCheck} />

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

      {total === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl text-brand">
            <FaHourglassHalf aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-ink">{paperTitle}</h2>
          <p className="mt-2 text-gray-600">{practiceText.noQuestions}</p>
        </section>
      ) : finished ? (
        <section className={`${cardClass} text-center sm:p-10`}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
            <FaCircleCheck aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink">{practiceText.completedTitle}</h2>
          <p className="mt-2 text-gray-700">
            {formatText(practiceText.completedMessage, { count: answeredCount, total })}
          </p>
          {answeredCount < total && (
            <p className="mt-1 text-sm text-amber-700">
              {formatText(practiceText.unanswered, {
                numbers: questions
                  .filter((item) => !answers[item.id])
                  .map((item) => item.number)
                  .join(', '),
              })}
            </p>
          )}
          <p className="mt-4 text-sm text-gray-500">{practiceText.resultsSoon}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => update({ finished: false, index: 0 })}
              className={secondaryButton}
            >
              {practiceText.review}
            </button>
            <button
              type="button"
              onClick={() => update({ finished: false, index: 0, answers: {} })}
              className="btn btn-primary !rounded-lg !px-5 !py-2.5"
            >
              {practiceText.restart}
            </button>
          </div>
        </section>
      ) : (
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

            <PracticeQuestion
              key={question.id}
              question={question}
              total={total}
              language={language}
              sourceLanguage={sourceLanguage}
              text={practiceText}
              selectedOptionId={answers[question.id]}
              onSelect={(optionId) => update({ answers: { ...answers, [question.id]: optionId } })}
            />

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => update({ index: index - 1 })}
                disabled={index === 0}
                className={secondaryButton}
              >
                <FaArrowLeft aria-hidden="true" />
                {practiceText.previous}
              </button>
              {isLast ? (
                <button
                  type="button"
                  onClick={() => update({ finished: true })}
                  className="btn btn-primary !rounded-lg !px-5 !py-2.5"
                >
                  <FaFlagCheckered aria-hidden="true" />
                  {practiceText.finish}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => update({ index: index + 1 })}
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
                      onClick={() => update({ index: itemIndex })}
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
      )}
    </div>
  )
}

export default PracticePaper
