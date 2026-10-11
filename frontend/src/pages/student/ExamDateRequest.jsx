import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaCalendarDays,
  FaCircleCheck,
  FaCircleInfo,
  FaClockRotateLeft,
  FaFileMedical,
  FaHourglassHalf,
  FaPaperPlane,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import ExamDateRequestSummary from '../../components/examDate/ExamDateRequestSummary'
import TuesdayCalendar from '../../components/examDate/TuesdayCalendar'
import { useNotifications } from '../../context/useNotifications'
import { listMyExamDateRequests, submitExamDateRequest } from '../../services/examDateRequestApi'
import {
  MAX_PREFERRED_DATES,
  MEDICAL_REPORT_REQUIRED_MESSAGE,
  formatExamDate,
  getSchoolDate,
  isSelectableDate,
} from '../../utils/examDateUtils'

const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

const medicalOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

// The request form: the medical report question first, then up to three future Tuesdays.
// The backend checks all of it again; `onSubmitted(request)` receives the saved request
// and `onConflict()` is called when the backend says a request is already pending.
function RequestForm({ onSubmitted, onConflict }) {
  // 'yes' | 'no' | '' (not answered yet)
  const [medical, setMedical] = useState('')
  const [dates, setDates] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [today, setToday] = useState(getSchoolDate)

  const toggleDate = (date) => {
    setError('')
    setDates((current) =>
      current.includes(date)
        ? current.filter((selectedDate) => selectedDate !== date)
        : current.length < MAX_PREFERRED_DATES
          ? [...current, date]
          : current,
    )
  }

  const askToSubmit = () => {
    // The page may have been open past midnight: a chosen date may no longer be in the future
    const now = getSchoolDate()
    const stillValid = dates.filter((date) => isSelectableDate(date, now))
    if (stillValid.length !== dates.length) {
      setToday(now)
      setDates(stillValid)
      setError('A selected date is no longer available and was removed. Please check your dates.')
      return
    }
    if (dates.length === 0) {
      setError('Select at least one Tuesday.')
      return
    }
    setError('')
    setConfirming(true)
  }

  const submit = async () => {
    setBusy(true)
    try {
      onSubmitted(await submitExamDateRequest({ medicalReportSubmitted: true, preferredDates: dates }))
    } catch (submitError) {
      setConfirming(false)
      setError(submitError.message)
      // 409: a request is already awaiting review (for example sent from another tab)
      if (submitError.status === 409) onConflict()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DashboardSection title="Medical Report" icon={FaFileMedical}>
        <fieldset>
          <legend className="font-semibold text-ink">Have you submitted or passed your medical?</legend>
          <div className="mt-4 flex flex-wrap gap-3">
            {medicalOptions.map(({ value, label }) => (
              <label
                key={value}
                className={`flex min-w-28 cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-3 font-semibold transition focus-within:ring-2 focus-within:ring-brand/30 ${
                  medical === value
                    ? 'border-brand bg-brand-soft text-ink'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-brand/40'
                }`}
              >
                <input
                  type="radio"
                  name="medicalReport"
                  value={value}
                  checked={medical === value}
                  onChange={() => {
                    setMedical(value)
                    setError('')
                  }}
                  className="h-4 w-4 accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {medical === 'no' && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 font-medium text-brand-dark"
          >
            <FaTriangleExclamation aria-hidden="true" className="mt-1 shrink-0" />
            {MEDICAL_REPORT_REQUIRED_MESSAGE}
          </p>
        )}
      </DashboardSection>

      {medical === 'yes' && (
        <DashboardSection title="Preferred Exam Dates" icon={FaCalendarDays}>
          <p className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            Examinations are held on Tuesdays. Select up to {MAX_PREFERRED_DATES} Tuesdays you are
            available on, in your order of preference. These are preferences: the school will
            confirm one date.
          </p>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <TuesdayCalendar
              today={today}
              selected={dates}
              max={MAX_PREFERRED_DATES}
              onToggle={toggleDate}
              disabled={busy}
            />

            <div>
              <h3 className="font-bold text-ink">
                Selected dates ({dates.length} of {MAX_PREFERRED_DATES})
              </h3>
              {dates.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
                  No dates selected yet. Choose a Tuesday on the calendar.
                </p>
              ) : (
                <ol className="mt-3 flex flex-col gap-2" aria-label="Selected dates">
                  {dates.map((date, index) => (
                    <li
                      key={date}
                      className="flex items-center justify-between gap-3 rounded-xl border-2 border-brand/30 bg-brand-soft px-4 py-2.5"
                    >
                      <span className="font-semibold text-ink">
                        <span className="mr-2 text-sm text-gray-500">{index + 1}.</span>
                        {formatExamDate(date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleDate(date)}
                        disabled={busy}
                        aria-label={`Remove ${formatExamDate(date)}`}
                        className="cursor-pointer rounded-full p-1.5 text-brand-dark transition hover:bg-brand hover:text-white disabled:opacity-50"
                      >
                        <FaXmark aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {dates.length >= MAX_PREFERRED_DATES && (
                <p className="mt-3 text-sm text-gray-600">
                  You have selected the maximum of {MAX_PREFERRED_DATES} dates. Remove one to choose
                  a different date.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-6 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={askToSubmit}
              disabled={busy || dates.length === 0}
              className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaPaperPlane aria-hidden="true" />
              Submit Exam Date Request
            </button>
          </div>
        </DashboardSection>
      )}

      {confirming && (
        <ConfirmDialog
          title="Submit exam date request?"
          message={`You are requesting a physical driving licence examination date on: ${dates.map(formatExamDate).join('; ')}. The school will review your request and confirm one date.`}
          confirmLabel="Submit Request"
          busy={busy}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}

// Student-only page: request a date for the physical driving licence examination and
// follow what happened to earlier requests. Everything shown comes from the backend, so
// it is the same after a refresh or a new login.
function ExamDateRequest() {
  const { refresh: refreshNotifications } = useNotifications()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  // Set after a submission on this visit, to show the confirmation message
  const [justSubmitted, setJustSubmitted] = useState(false)

  const load = useCallback(
    () =>
      listMyExamDateRequests()
        .then((loaded) => {
          setData(loaded)
          setError('')
        })
        .catch((loadError) => setError(loadError.message)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setError('')
    load()
  }

  const handleSubmitted = (request) => {
    setJustSubmitted(true)
    setData((current) => ({ canSubmit: false, requests: [request, ...current.requests] }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const backLink = (
    <Link
      to="/student-dashboard/exams"
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      Back to Exams
    </Link>
  )
  const banner = (
    <DashboardWelcome
      title="Request Driving Licence Exam Date"
      message="Choose the Tuesdays you are available for your physical driving licence examination."
      icon={FaCalendarCheck}
    />
  )

  if (!data) {
    return (
      <>
        {backLink}
        {banner}
        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">Your exam date requests could not be loaded.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={retry} className="btn btn-primary mt-5 !rounded-lg !px-5 !py-2">
              Try again
            </button>
          </div>
        ) : (
          <p role="status" className={noticeClass}>
            Loading...
          </p>
        )}
      </>
    )
  }

  const pending = data.requests.find((request) => request.status === 'PENDING')
  const earlier = data.requests.filter((request) => request !== pending)

  return (
    <>
      {backLink}
      {banner}

      {pending ? (
        <DashboardSection title="Your Request" icon={FaHourglassHalf}>
          {justSubmitted ? (
            <p
              role="status"
              className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800"
            >
              <FaCircleCheck aria-hidden="true" className="mt-1 shrink-0" />
              Your exam date request has been submitted. You will be notified when the school has
              reviewed it.
            </p>
          ) : (
            <p className="mb-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 font-medium text-amber-800">
              <FaCircleInfo aria-hidden="true" className="mt-1 shrink-0" />
              You already have an exam date request awaiting admin review. You can submit a new
              request once it has been reviewed.
            </p>
          )}
          <ExamDateRequestSummary request={pending} />
        </DashboardSection>
      ) : (
        <RequestForm
          onSubmitted={(request) => {
            handleSubmitted(request)
            refreshNotifications()
          }}
          onConflict={load}
        />
      )}

      {earlier.length > 0 && (
        <DashboardSection title="Earlier Requests" icon={FaClockRotateLeft}>
          <ul className="flex flex-col gap-4">
            {earlier.map((request) => (
              <li key={request.id} className="rounded-xl border border-gray-200 px-4 sm:px-5">
                <ExamDateRequestSummary request={request} />
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}
    </>
  )
}

export default ExamDateRequest
