import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCircleCheck,
  FaCircleInfo,
  FaClockRotateLeft,
  FaHourglassHalf,
  FaListCheck,
  FaMoneyBillWave,
  FaPaperPlane,
} from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import AttemptHistoryTable from '../../components/licenceExam/AttemptHistoryTable'
import { NextActionLink } from '../../components/licenceExam/AttemptSummaryCard'
import ReattemptRequestSummary from '../../components/licenceExam/ReattemptRequestSummary'
import BankDetails from '../../components/registration/BankDetails'
import BranchDetails from '../../components/registration/BranchDetails'
import FileUpload from '../../components/registration/FileUpload'
import { useNotifications } from '../../context/useNotifications'
import { PAYMENT_METHODS, paymentMethods } from '../../data/registrationData'
import { getMyLicenceExam, submitReattemptRequest } from '../../services/licenceExamApi'
import { formatExamDate } from '../../utils/examDateUtils'
import { formatAttempt, formatFee } from '../../utils/licenceExamUtils'
import { getReceiptError } from '../../utils/registrationValidation'

const noticeClass =
  'rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm sm:p-12'

// The school's payment details for each method: the same ones the Apply Now form shows
const detailsByMethod = {
  [PAYMENT_METHODS.bankTransfer]: BankDetails,
  [PAYMENT_METHODS.visitBranch]: BranchDetails,
}

const validate = ({ paymentMethod, receipt }) => {
  const errors = {}
  if (!paymentMethod) errors.paymentMethod = 'Please select a payment method.'
  if (!receipt) errors.receipt = 'Please upload the payment receipt/document.'
  else if (getReceiptError(receipt)) errors.receipt = getReceiptError(receipt)
  return errors
}

// The payment form for the student's most recent failed attempt: the receipt of the
// reattempt fee. Submitting it approves nothing: the school verifies it first. The backend
// decides which attempt is paid for and checks everything again; `onSubmitted()` is called
// once saved. (A third failure costs no fee: the account is locked and a new registration
// application is required instead, so this form is only ever for a first or second failure.)
function ReattemptPaymentForm({ summary, onSubmitted, onConflict }) {
  const { reattemptFee: fee, failedAttempt } = summary
  const [form, setForm] = useState({ paymentMethod: '', receipt: null })
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const errors = validate(form)
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }
  // A bad file is flagged as soon as it is chosen; a missing one only after a submit attempt
  const fileError = (field) =>
    serverErrors[field] ?? (showErrors ? errors[field] : getReceiptError(form[field]))

  const askToSubmit = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    setConfirming(true)
  }

  const submit = async () => {
    setBusy(true)
    try {
      await submitReattemptRequest({ paymentMethod: form.paymentMethod, receipt: form.receipt })
      onSubmitted()
    } catch (submitError) {
      setConfirming(false)
      setError(submitError.message)
      setServerErrors(submitError.fieldErrors ?? {})
      // 409: what the page shows is out of date (for example already submitted in another tab)
      if (submitError.status === 409) onConflict()
    } finally {
      setBusy(false)
    }
  }

  const MethodDetails = detailsByMethod[form.paymentMethod]
  const attempt = formatAttempt(failedAttempt.attemptNumber, summary.attemptsPerCycle)

  return (
    <>
      <DashboardSection title="What You Need" icon={FaListCheck}>
        <p className="text-gray-700">
          This payment is for your unsuccessful examination on{' '}
          <strong className="text-ink">{formatExamDate(failedAttempt.examDate)}</strong> ({attempt},
          attempt cycle {failedAttempt.cycleNumber}).
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Reattempt fee
            </dt>
            <dd data-requirement="fee" className="mt-1 text-lg font-extrabold text-ink">
              {formatFee(fee)}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Attempts remaining
            </dt>
            <dd data-requirement="remaining" className="mt-1 text-lg font-extrabold text-ink">
              {summary.attemptsRemaining} of {summary.attemptsPerCycle}
            </dd>
          </div>
        </dl>
        <p className="mt-4 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">
          <FaCircleInfo aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
          <span>
            Every unsuccessful attempt requires a {formatFee(fee)} reattempt fee. The school
            verifies your receipt before you can request another examination date. After{' '}
            {summary.attemptsPerCycle} unsuccessful attempts your account is locked and a new
            registration application with a new medical report is required.
          </span>
        </p>
      </DashboardSection>

      <DashboardSection title={`Reattempt Fee: ${formatFee(fee)}`} icon={FaMoneyBillWave}>
        <fieldset aria-describedby="paymentMethod-error">
          <legend className="mb-3 font-semibold text-ink">
            How are you paying the {formatFee(fee)} reattempt fee?
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {paymentMethods.map(({ id, label }) => (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-3 font-semibold transition focus-within:ring-2 focus-within:ring-brand/30 ${
                  form.paymentMethod === id
                    ? 'border-brand bg-brand-soft text-ink'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-brand/40'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={id}
                  checked={form.paymentMethod === id}
                  onChange={() => update('paymentMethod', id)}
                  className="h-4 w-4 accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
          <p id="paymentMethod-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
            {serverErrors.paymentMethod ?? (showErrors ? errors.paymentMethod : undefined)}
          </p>
        </fieldset>

        {MethodDetails && (
          <div className="mt-2 grid gap-6 md:grid-cols-2">
            <MethodDetails />
            <FileUpload
              id="receipt"
              label="Upload Payment Receipt / Deposit Slip"
              file={form.receipt}
              error={fileError('receipt')}
              onChange={(file) => update('receipt', file)}
            />
          </div>
        )}
      </DashboardSection>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {error}
          </p>
        )}
        {showErrors && Object.keys(errors).length > 0 && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
            {Object.values(errors)[0]}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={askToSubmit}
            disabled={busy}
            className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-wait disabled:opacity-70"
          >
            <FaPaperPlane aria-hidden="true" />
            Submit for Verification
          </button>
        </div>
      </section>

      {confirming && (
        <ConfirmDialog
          title="Submit for verification?"
          message={`The receipt of your ${formatFee(fee)} payment will be sent to the school. You can request another examination date after the school has approved it.`}
          confirmLabel="Submit"
          busy={busy}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}

// Student-only page: pay the reattempt fee that a first or second failed attempt requires and follow
// its verification. Everything shown comes from the backend, so it is the same after a
// refresh.
function ReattemptPayment() {
  const { notifications, refresh: refreshNotifications } = useNotifications()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  // Set after a submission on this visit, to show the confirmation message
  const [justSubmitted, setJustSubmitted] = useState(false)
  // A new notification may mean the school has decided: load again when one arrives
  const newestNotificationId = notifications[0]?.id ?? 0

  const load = useCallback(
    () =>
      getMyLicenceExam()
        .then((loaded) => {
          setData(loaded)
          setError('')
        })
        .catch((loadError) => setError(loadError.message)),
    [],
  )

  useEffect(() => {
    load()
  }, [load, newestNotificationId])

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
      title="Reattempt Fee Payment"
      message="Pay the reattempt fee after an unsuccessful examination to request another date."
      icon={FaMoneyBillWave}
    />
  )

  if (!data) {
    return (
      <>
        {backLink}
        {banner}
        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">Your examination attempts could not be loaded.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={load} className="btn btn-primary mt-5 !rounded-lg !px-5 !py-2">
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

  const { summary, attempts, reattemptRequests } = data
  const pending = reattemptRequests.find((request) => request.status === 'PENDING')
  const earlier = reattemptRequests.filter((request) => request !== pending)
  // The rejected submission the student is replacing, shown with its reason
  const rejected = summary.status === 'REATTEMPT_PAYMENT_REJECTED' ? earlier[0] : null

  return (
    <>
      {backLink}
      {banner}

      {pending ? (
        <DashboardSection title="Awaiting Verification" icon={FaHourglassHalf}>
          <p
            role="status"
            className={`mb-4 flex items-start gap-3 rounded-lg px-4 py-3 font-medium ${
              justSubmitted
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {justSubmitted ? (
              <FaCircleCheck aria-hidden="true" className="mt-1 shrink-0" />
            ) : (
              <FaCircleInfo aria-hidden="true" className="mt-1 shrink-0" />
            )}
            {justSubmitted
              ? 'Your payment has been submitted. You will be notified when the school has verified it.'
              : summary.message}
          </p>
          <ReattemptRequestSummary request={pending} role="student" />
        </DashboardSection>
      ) : summary.canPayReattemptFee ? (
        <>
          {rejected && (
            <div
              role="alert"
              className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-danger-dark"
            >
              <p className="flex items-start gap-3 font-bold">
                <FaCircleInfo aria-hidden="true" className="mt-1 shrink-0" />
                {summary.message}
              </p>
              <p className="mt-2 pl-7 text-sm">
                <span className="font-semibold">Reason given by the school:</span>{' '}
                {rejected.rejectionReason}
              </p>
            </div>
          )}
          <ReattemptPaymentForm
            summary={summary}
            onSubmitted={() => {
              setJustSubmitted(true)
              load()
              refreshNotifications()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onConflict={load}
          />
        </>
      ) : (
        <DashboardSection title="No Payment Due" icon={FaCircleInfo}>
          <p className="font-medium text-ink">
            {summary.passed
              ? summary.message
              : 'You have no reattempt fee to pay at the moment. A fee is only required after an unsuccessful examination attempt.'}
          </p>
          <div className="mt-5 flex justify-end">
            <NextActionLink summary={summary} />
          </div>
        </DashboardSection>
      )}

      {earlier.length > 0 && (
        <DashboardSection title="Payment History" icon={FaClockRotateLeft}>
          <ul className="flex flex-col gap-4">
            {earlier.map((request) => (
              <li key={request.id} className="rounded-xl border border-gray-200 px-4 sm:px-5">
                <ReattemptRequestSummary request={request} role="student" />
              </li>
            ))}
          </ul>
        </DashboardSection>
      )}

      <DashboardSection title="Examination History" icon={FaClockRotateLeft}>
        <AttemptHistoryTable attempts={attempts} />
      </DashboardSection>
    </>
  )
}

export default ReattemptPayment
