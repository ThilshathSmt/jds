import { useCallback, useEffect, useState } from 'react'
import { FaCommentDots, FaFloppyDisk, FaPaperPlane, FaPen, FaPlus } from 'react-icons/fa6'
import Modal from '../../components/admin/Modal'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardTable from '../../components/dashboard/DashboardTable'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import FormField from '../../components/registration/FormField'
import { listMyFeedbacks, listMyStudents, saveFeedback } from '../../services/practicalApi'
import { formatDateTime } from '../../utils/formatUtils'
import { formatDayShort, recommendationLabels, safetyLabels } from '../../utils/practicalUtils'

const TEXT_MAX = 2000
const emptyForm = {
  cycleId: '',
  lessonIds: [],
  drivingSkills: '',
  strengths: '',
  improvements: '',
  safetyAwareness: '',
  comments: '',
  recommendation: '',
}

// What a submitted feedback must contain (the backend checks the same)
const validateForSubmit = (form) => {
  const errors = {}
  if (!form.cycleId) errors.cycleId = 'Choose the student.'
  if (form.lessonIds.length === 0) errors.lessonIds = 'Choose at least one lesson you taught.'
  if (!form.drivingSkills.trim()) errors.drivingSkills = "Describe the student's driving skills and progress."
  if (!form.strengths.trim()) errors.strengths = 'Describe the strengths.'
  if (!form.improvements.trim()) errors.improvements = 'Describe the areas requiring improvement.'
  if (!form.safetyAwareness) errors.safetyAwareness = 'Rate the safety awareness.'
  if (!form.recommendation) errors.recommendation = 'Choose a recommendation.'
  return errors
}

// Writing or editing a draft. "Save Draft" keeps it private; "Submit" sends it to the
// school and makes it final. `onSaved(feedback, submitted)`.
function FeedbackDialog({ feedback, students, onSaved, onClose }) {
  const [form, setForm] = useState(
    feedback
      ? {
          cycleId: feedback.cycleId,
          lessonIds: feedback.lessons.map((lesson) => lesson.id),
          drivingSkills: feedback.drivingSkills ?? '',
          strengths: feedback.strengths ?? '',
          improvements: feedback.improvements ?? '',
          safetyAwareness: feedback.safetyAwareness ?? '',
          comments: feedback.comments ?? '',
          recommendation: feedback.recommendation ?? '',
        }
      : emptyForm,
  )
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const student = students.find((entry) => entry.cycleId === Number(form.cycleId))
  const change = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }
  const toggleLesson = (id) =>
    change('lessonIds', form.lessonIds.includes(id) ? form.lessonIds.filter((item) => item !== id) : [...form.lessonIds, id])

  const save = async (submit) => {
    const found = submit ? validateForSubmit(form) : !form.cycleId ? { cycleId: 'Choose the student.' } : {}
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await saveFeedback(feedback?.id, { ...form, cycleId: Number(form.cycleId), submit })
      onSaved(saved, submit)
    } catch (saveError) {
      setError(saveError.message)
      setErrors(saveError.fieldErrors ?? {})
    } finally {
      setBusy(false)
    }
  }

  const textField = (name, label, required = true) => (
    <FormField id={`fb-${name}`} label={label} required={required} error={errors[name]}>
      <textarea
        id={`fb-${name}`}
        rows={3}
        maxLength={TEXT_MAX}
        value={form[name]}
        onChange={(event) => change(name, event.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={`fb-${name}-error`}
        className={`form-input ${errors[name] ? 'form-input-error' : ''}`}
      />
    </FormField>
  )
  const select = (name, label, labels) => (
    <FormField id={`fb-${name}`} label={label} required error={errors[name]}>
      <select
        id={`fb-${name}`}
        value={form[name]}
        onChange={(event) => change(name, event.target.value)}
        aria-describedby={`fb-${name}-error`}
        className={`form-input ${errors[name] ? 'form-input-error' : ''}`}
      >
        <option value="">Select...</option>
        {Object.entries(labels).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </FormField>
  )

  return (
    <Modal title={feedback ? 'Edit Feedback Draft' : 'New Feedback'} icon={FaCommentDots} busy={busy} onClose={onClose} className="!w-[min(44rem,calc(100vw-2rem))]">
      <FormField id="fb-cycleId" label="Student" required error={errors.cycleId}>
        <select
          id="fb-cycleId"
          value={form.cycleId}
          disabled={Boolean(feedback)}
          onChange={(event) => {
            change('cycleId', event.target.value)
            change('lessonIds', [])
          }}
          aria-describedby="fb-cycleId-error"
          className={`form-input ${errors.cycleId ? 'form-input-error' : ''}`}
        >
          <option value="">Select a student you teach...</option>
          {students.map((entry) => (
            <option key={entry.cycleId} value={entry.cycleId}>
              {entry.student.name} ({entry.student.drivingSchoolId}) · cycle {entry.cycleNumber}
            </option>
          ))}
        </select>
      </FormField>

      {student && (
        <fieldset className="mb-4" aria-describedby="fb-lessons-error">
          <legend className="mb-2 font-semibold text-ink">
            Lessons this feedback is about <span className="text-danger">*</span>
          </legend>
          {student.lessons.length === 0 ? (
            <p className="text-sm text-gray-600">You have no attended lessons with this student yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {student.lessons.map((lesson) => (
                <label key={lesson.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${form.lessonIds.includes(lesson.id) ? 'border-brand bg-brand-soft' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={form.lessonIds.includes(lesson.id)} onChange={() => toggleLesson(lesson.id)} className="accent-brand" />
                  Lesson {lesson.lessonNumber} · {formatDayShort(lesson.date)}
                </label>
              ))}
            </div>
          )}
          <p id="fb-lessons-error" role="alert" className="mt-1 min-h-5 text-sm text-danger">
            {errors.lessonIds}
          </p>
        </fieldset>
      )}

      {textField('drivingSkills', 'Driving skills and progress')}
      <div className="grid gap-x-4 sm:grid-cols-2">
        {textField('strengths', 'Strengths')}
        {textField('improvements', 'Areas requiring improvement')}
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {select('safetyAwareness', 'Safety awareness', safetyLabels)}
        {select('recommendation', 'Recommendation', recommendationLabels)}
      </div>
      {textField('comments', 'General comments', false)}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600">
        A draft is visible only to you. Once submitted, the feedback is sent to the school and can
        no longer be changed.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="btn !rounded-lg bg-gray-200 !px-5 !py-2 text-ink hover:bg-gray-300 disabled:opacity-60">
          Cancel
        </button>
        <button type="button" onClick={() => save(false)} disabled={busy} className="btn btn-outline !rounded-lg !px-5 !py-2 disabled:opacity-60">
          <FaFloppyDisk aria-hidden="true" />
          Save Draft
        </button>
        <button type="button" onClick={() => save(true)} disabled={busy} className="btn btn-primary !rounded-lg !px-5 !py-2 disabled:cursor-wait disabled:opacity-70">
          <FaPaperPlane aria-hidden="true" />
          {busy ? 'Saving...' : 'Submit'}
        </button>
      </div>
    </Modal>
  )
}

// Instructor-only page: the signed-in instructor's own feedback on the students they teach
function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  // null | 'new' | a draft
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    Promise.all([listMyFeedbacks(), listMyStudents()])
      .then(([loadedFeedbacks, loadedStudents]) => {
        if (!active) return
        setFeedbacks(loadedFeedbacks)
        setStudents(loadedStudents)
      })
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [])

  const saved = (feedback, submitted) => {
    setEditing(null)
    setFeedbacks((current) => [feedback, ...current.filter((item) => item.id !== feedback.id)])
    setToast({ variant: 'success', message: submitted ? `Feedback for ${feedback.student.name} submitted.` : 'Draft saved.' })
  }

  const columns = [
    {
      key: 'student',
      label: 'Student',
      render: (row) => (
        <span>
          {row.student.name}
          <span className="block text-xs font-normal text-gray-500">{row.student.drivingSchoolId}</span>
        </span>
      ),
    },
    { key: 'lessons', label: 'Lessons', render: (row) => row.lessons.map((lesson) => lesson.lessonNumber).join(', ') || '–' },
    { key: 'recommendation', label: 'Recommendation', render: (row) => recommendationLabels[row.recommendation] ?? '–' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status === 'SUBMITTED' ? 'APPROVED' : 'PENDING'} label={row.status === 'SUBMITTED' ? 'Submitted' : 'Draft'} />,
    },
    { key: 'date', label: 'Date', render: (row) => formatDateTime(row.submittedAt ?? row.updatedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) =>
        row.status === 'DRAFT' ? (
          <button type="button" onClick={() => setEditing(row)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand">
            <FaPen aria-hidden="true" />
            Edit
          </button>
        ) : (
          <span className="text-xs text-gray-500">Final</span>
        ),
    },
  ]

  return (
    <>
      <DashboardWelcome title="Feedbacks" message="Your feedback on the students you teach." icon={FaCommentDots} />
      <DashboardSection
        title="My Feedback"
        icon={FaCommentDots}
        aside={
          <button type="button" onClick={() => setEditing('new')} disabled={students.length === 0} className="btn btn-primary !rounded-lg !px-5 !py-2.5 disabled:cursor-not-allowed disabled:opacity-60">
            <FaPlus aria-hidden="true" />
            New Feedback
          </button>
        }
      >
        {feedbacks === null ? (
          <p role={error ? 'alert' : 'status'} className="py-8 text-center text-gray-600">
            {error || 'Loading feedback...'}
          </p>
        ) : feedbacks.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            {students.length === 0
              ? 'You have no assigned students yet. Feedback can be written once the school assigns you lessons.'
              : 'You have not written any feedback yet.'}
          </p>
        ) : (
          <DashboardTable caption="My feedback" columns={columns} rows={feedbacks} />
        )}
      </DashboardSection>
      {editing && (
        <FeedbackDialog feedback={editing === 'new' ? null : editing} students={students} onSaved={saved} onClose={() => setEditing(null)} />
      )}
      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default Feedbacks
