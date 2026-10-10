import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FaArrowLeft, FaArrowRight, FaFileCircleCheck, FaHourglassHalf } from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import LanguageSelector from '../../components/exam/LanguageSelector'
import { getExamIcon } from '../../data/examIcons'
import { getLanguage, getTranslation, languages } from '../../data/examPapersData'
import { formatText, getPracticeText, pickText } from '../../data/examPracticeText'
import { listExamPapers } from '../../services/examApi'
import useExamLanguage from '../../utils/useExamLanguage'

const LIST_PATH = '/student-dashboard/exams'

const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

function PaperCard({ examId, paper, language }) {
  const text = getTranslation(language)
  const practiceText = getPracticeText(language)
  const title = pickText(paper.title, language, 'en')

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg sm:p-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl text-brand">
        <FaFileCircleCheck aria-hidden="true" />
      </span>
      <h2 lang={getLanguage(title.language).htmlLang} className="mt-5 text-xl font-extrabold text-ink sm:text-2xl">
        {title.value}
      </h2>
      <p className="mt-2 text-gray-600">
        {paper.questionCount > 0
          ? formatText(practiceText.questionCount, { count: paper.questionCount })
          : practiceText.noQuestions}
      </p>
      <div className="mt-auto pt-6">
        <Link
          to={`${LIST_PATH}/${examId}/${paper.id}`}
          aria-label={`${text.viewPaper}: ${title.value}`}
          className="btn btn-primary !rounded-lg !px-5 !py-2.5"
        >
          {text.viewPaper}
          <FaArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

// One exam category with its practice papers, loaded from the backend. A category that
// has no papers yet shows the backend's "available soon" notice instead.
function ExamDetails() {
  const { examType } = useParams()
  const [language, setLanguage] = useExamLanguage()
  // Keyed by exam type, so a previous exam is never shown while another one loads
  const [loaded, setLoaded] = useState({ examType: null, data: null, error: null })

  useEffect(() => {
    let active = true
    listExamPapers(examType)
      .then((data) => active && setLoaded({ examType, data, error: null }))
      .catch((error) => active && setLoaded({ examType, data: null, error }))
    return () => {
      active = false
    }
  }, [examType])

  const { data, error } = loaded.examType === examType ? loaded : { data: null, error: null }

  const backLink = (
    <Link
      to={LIST_PATH}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      Back to Exams
    </Link>
  )

  if (!data) {
    return (
      <>
        {backLink}
        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">
              {error.status === 404 ? 'Exam not found' : 'The exam could not be loaded.'}
            </p>
            <p className="mt-1 text-sm">
              {error.status === 404
                ? 'This exam category does not exist. Please choose one from the Exams page.'
                : error.message}
            </p>
          </div>
        ) : (
          <p role="status" className={noticeClass}>
            Loading exam...
          </p>
        )}
      </>
    )
  }

  const { exam, papers } = data
  const text = getTranslation(language)

  return (
    <>
      {backLink}
      <DashboardWelcome title={exam.title} message={exam.description} icon={getExamIcon(exam.id)} />

      {papers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl text-brand">
            <FaHourglassHalf aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold text-ink">{exam.title}</h2>
          <p className="mt-2 text-gray-600">{exam.notice}</p>
        </section>
      ) : (
        <div lang={getLanguage(language).htmlLang} className="flex flex-col gap-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <LanguageSelector
              languages={languages}
              selected={language}
              onChange={setLanguage}
              label={text.languageLabel}
            />
          </section>

          <ul className="grid gap-6 md:grid-cols-2">
            {papers.map((paper) => (
              <li key={paper.id}>
                <PaperCard examId={exam.id} paper={paper} language={language} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default ExamDetails
