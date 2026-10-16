import { formatDateTime } from '../../utils/formatUtils'
import { formatDayShort, recommendationLabels, safetyLabels } from '../../utils/practicalUtils'
import StatusBadge from '../dashboard/StatusBadge'

// One submitted instructor feedback, read-only (admin pages). `children` adds actions.
function FeedbackCard({ feedback, children }) {
  const rows = [
    { label: 'Driving skills and progress', value: feedback.drivingSkills },
    { label: 'Strengths', value: feedback.strengths },
    { label: 'Areas requiring improvement', value: feedback.improvements },
    { label: 'Safety awareness', value: safetyLabels[feedback.safetyAwareness] },
    { label: 'General comments', value: feedback.comments || '–' },
  ]
  return (
    <article className="rounded-xl border border-gray-200 p-4" data-feedback-id={feedback.id}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-ink">
            {feedback.student.name} <span className="font-normal text-gray-500">({feedback.student.drivingSchoolId})</span>
          </p>
          <p className="text-sm text-gray-600">
            By {feedback.instructor.name} ({feedback.instructor.drivingSchoolId}) · {formatDateTime(feedback.submittedAt)}
          </p>
          <p className="text-sm text-gray-600">
            Lessons: {feedback.lessons.map((lesson) => `${lesson.lessonNumber} (${formatDayShort(lesson.date)})`).join(', ')}
          </p>
        </div>
        <StatusBadge
          status={feedback.recommendation === 'READY_FOR_TEST' ? 'APPROVED' : 'PENDING'}
          label={recommendationLabels[feedback.recommendation]}
        />
      </header>
      <dl className="mt-3 divide-y divide-gray-100">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="break-words whitespace-pre-line text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </article>
  )
}

export default FeedbackCard
