import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowRight, FaFileSignature } from 'react-icons/fa6'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import { getExamIcon } from '../../data/examIcons'
import { listExams } from '../../services/examApi'

const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

function ExamCard({ exam }) {
  const Icon = getExamIcon(exam.id)

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg sm:p-8">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl text-brand">
        <Icon aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-ink sm:text-2xl">{exam.title}</h2>
      <p className="mt-2 text-gray-600">{exam.description}</p>
      <div className="mt-auto pt-6">
        {exam.available ? (
          <Link
            to={`/student-dashboard/exams/${exam.id}`}
            aria-label={`View ${exam.title}`}
            className="btn btn-primary !rounded-lg !px-5 !py-2.5"
          >
            View Exam
            <FaArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-block rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-500">
            Not available yet
          </span>
        )}
      </div>
    </article>
  )
}

// Student-only page listing the theory exam categories, loaded from the backend
function Exams() {
  const [exams, setExams] = useState(null)
  const [error, setError] = useState('')
  // Bumped by "Try again" so the list is fetched again
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    listExams()
      .then((loaded) => active && setExams(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [attempt])

  const retry = () => {
    setError('')
    setAttempt((count) => count + 1)
  }

  return (
    <>
      <DashboardWelcome
        title="Exams"
        message="Choose an exam category to prepare for your driving theory examination."
        icon={FaFileSignature}
      />

      {error ? (
        <div role="alert" className={noticeClass}>
          <p className="font-semibold text-ink">The exams could not be loaded.</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="btn btn-primary mt-5 !rounded-lg !px-5 !py-2"
          >
            Try again
          </button>
        </div>
      ) : !exams ? (
        <p role="status" className={`${noticeClass} flex items-center justify-center gap-3`}>
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent"
          />
          Loading exams...
        </p>
      ) : exams.length === 0 ? (
        <p className={noticeClass}>No exams are available at the moment. Please check back later.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {exams.map((exam) => (
            <li key={exam.id}>
              <ExamCard exam={exam} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default Exams
