import { useCallback, useEffect, useState } from 'react'
import { FaCalendarDays, FaCircleInfo, FaFloppyDisk, FaRoad } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import Toast from '../../components/dashboard/Toast'
import { getExamWeekdays, updateExamWeekdays } from '../../services/examDateRequestApi'
import { EXAM_WEEKDAYS, formatExamWeekdays } from '../../utils/examDateUtils'
import { formatDateTime } from '../../utils/formatUtils'

const sameDays = (a, b) => a.length === b.length && a.every((value) => b.includes(value))

// The weekday toggles. `saved` is what the backend has; the form is remounted after a save
// so it starts from the saved days again.
function ExamDaysForm({ saved, onSaved, onToast }) {
  const [weekdays, setWeekdays] = useState(saved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const changed = !sameDays(weekdays, saved)

  const toggle = (value) => {
    setError('')
    setWeekdays((current) =>
      current.includes(value) ? current.filter((day) => day !== value) : [...current, value].sort((a, b) => a - b),
    )
  }

  const save = async (event) => {
    event.preventDefault()
    // The backend checks the same rule
    if (weekdays.length === 0) {
      setError('Select at least one examination day.')
      return
    }
    setBusy(true)
    try {
      const result = await updateExamWeekdays(weekdays)
      onSaved(result)
      onToast({
        variant: 'success',
        message: `Driving exam days saved. Students can now request ${formatExamWeekdays(result.weekdays)}.`,
      })
    } catch (saveError) {
      setError(saveError.fieldErrors?.weekdays ?? '')
      onToast({ variant: 'error', message: saveError.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={save}>
      <fieldset>
        <legend className="font-semibold text-ink">Days students may request</legend>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXAM_WEEKDAYS.map(({ value, name, selectable }) => {
            const checked = selectable && weekdays.includes(value)
            return (
              <li key={value}>
                <label
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 font-semibold transition focus-within:ring-2 focus-within:ring-brand/30 ${
                    !selectable
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                      : checked
                        ? 'cursor-pointer border-brand bg-brand-soft text-ink'
                        : 'cursor-pointer border-gray-200 bg-white text-gray-700 hover:border-brand/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={value}
                    checked={checked}
                    disabled={!selectable || busy}
                    onChange={() => toggle(value)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="flex-1">{name}</span>
                  {!selectable && <span className="text-xs font-medium">Not available</span>}
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-5">
        {changed && <span className="text-sm text-gray-600">You have unsaved changes.</span>}
        <button
          type="submit"
          disabled={busy || !changed}
          className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaFloppyDisk aria-hidden="true" />
          {busy ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

// Admin-only page: the days of the week on which students may request their physical
// driving licence examination. Loaded from and saved to the backend, which checks every new
// exam date request against the saved days. Saturday and Sunday are never offered.
function DrivingExam() {
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getExamWeekdays()
      .then((loaded) => active && setConfig(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <DashboardWelcome
        title="Driving Exam"
        message="Choose the weekdays on which students can request their physical driving licence examination."
        icon={FaRoad}
      />

      {!config ? (
        <p role={error ? 'alert' : 'status'} className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          {error || 'Loading examination days...'}
        </p>
      ) : (
        <DashboardSection title="Permitted Examination Days" icon={FaCalendarDays}>
          <p className="mb-5 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">
            <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <span>
              Students currently can request <strong>{formatExamWeekdays(config.weekdays)}</strong>.
              Changes apply to new exam date requests only: requests already submitted and approved
              examination dates are kept as they are.
              {config.updatedAt && <> Last saved {formatDateTime(config.updatedAt)}.</>}
            </span>
          </p>
          <ExamDaysForm key={config.weekdays.join(',')} saved={config.weekdays} onSaved={setConfig} onToast={setToast} />
        </DashboardSection>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default DrivingExam
