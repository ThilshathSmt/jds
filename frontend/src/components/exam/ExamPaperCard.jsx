import { Link } from 'react-router-dom'
import { FaArrowRight, FaFileCircleCheck } from 'react-icons/fa6'

function ExamPaperCard({ id, title, label, actionText, language }) {
  return (
    <Link
      to={`/exam-papers/${id}`}
      // Carry the chosen language over so the paper page opens in the same language
      state={{ language }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-brand/40 hover:shadow-xl"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-brand" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
          {label}
        </span>
        <span className="text-3xl font-extrabold text-gray-200 transition group-hover:text-brand/30">
          {id}
        </span>
      </div>

      <span className="mx-auto my-8 flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl text-brand transition duration-300 group-hover:bg-brand group-hover:text-white">
        <FaFileCircleCheck aria-hidden="true" />
      </span>

      <h3 className="text-center text-lg font-bold text-ink sm:text-xl">{title}</h3>

      <span className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4 text-sm font-semibold text-brand">
        {actionText}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft transition group-hover:translate-x-1 group-hover:bg-brand group-hover:text-white">
          <FaArrowRight aria-hidden="true" />
        </span>
      </span>
    </Link>
  )
}

export default ExamPaperCard
