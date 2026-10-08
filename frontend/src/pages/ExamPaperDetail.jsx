import { Link, useLocation, useParams } from 'react-router-dom'
import { FaArrowLeft, FaFileCircleCheck, FaFileCircleXmark } from 'react-icons/fa6'
import {
  DEFAULT_LANGUAGE,
  findExamPaper,
  getLanguage,
  getPaperTitle,
  getTranslation,
} from '../data/examPapersData'

// Placeholder page for a single paper. The questions, timer and submission will be built here later.
function ExamPaperDetail() {
  const { paperId } = useParams()
  const location = useLocation()
  const language = location.state?.language ?? DEFAULT_LANGUAGE
  const text = getTranslation(language)
  const paper = findExamPaper(paperId)
  const Icon = paper ? FaFileCircleCheck : FaFileCircleXmark

  return (
    <section lang={getLanguage(language).htmlLang} className="bg-gray-50 py-10 sm:py-14">
      <div className="container-page">
        <Link
          to="/exam-papers"
          state={{ language }}
          className="inline-flex items-center gap-2 font-semibold text-brand transition hover:text-brand-dark"
        >
          <FaArrowLeft aria-hidden="true" />
          {text.backToPapers}
        </Link>

        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-4xl text-brand">
            <Icon aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">
            {paper ? getPaperTitle(paper, language) : text.notFoundTitle}
          </h1>
          <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-brand" aria-hidden="true" />
          <p className="mt-6 text-gray-600">{paper ? text.placeholder : text.notFoundText}</p>
        </div>
      </div>
    </section>
  )
}

export default ExamPaperDetail
