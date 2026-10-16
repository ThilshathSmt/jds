import { useCallback, useEffect, useState } from 'react'
import { FaCarSide, FaChalkboardUser, FaMoneyBillWave, FaRoad } from 'react-icons/fa6'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import Toast from '../../components/dashboard/Toast'
import LessonScheduleTable from '../../components/practical/LessonScheduleTable'
import PracticalSummary from '../../components/practical/PracticalSummary'
import BankDetails from '../../components/registration/BankDetails'
import BranchDetails from '../../components/registration/BranchDetails'
import FileUpload from '../../components/registration/FileUpload'
import { getResponsibilityLabel } from '../../data/instructorData'
import { PAYMENT_METHODS, paymentMethods } from '../../data/registrationData'
import { getMyPractical, submitPracticalPayment } from '../../services/practicalApi'
import { formatFee, verificationLabels } from '../../utils/licenceExamUtils'
import { getReceiptError } from '../../utils/registrationValidation'
import useRefetchOnFocus from '../../utils/useRefetchOnFocus'

const detailsByMethod = {
  [PAYMENT_METHODS.bankTransfer]: BankDetails,
  [PAYMENT_METHODS.visitBranch]: BranchDetails,
}

// The practical reattempt fee for the student's last failed practical test. The amount is
// the backend's (fixed when the result was recorded); uploading approves nothing.
function PaymentForm({ test, onSubmitted }) {
  const [paymentMethod, setPaymentMethod] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const errors = {
    ...(!paymentMethod ? { paymentMethod: 'Please select a payment method.' } : {}),
    ...(!receipt ? { receipt: 'Please upload the payment receipt/document.' } : getReceiptError(receipt) ? { receipt: getReceiptError(receipt) } : {}),
  }
  const MethodDetails = detailsByMethod[paymentMethod]
  const fee = formatFee(test.owedAttempt.reattemptFee)

  const submit = async (event) => {
    event.preventDefault()
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      onSubmitted(await submitPracticalPayment({ paymentMethod, receipt }))
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} data-practical-payment-form>
      <p className="mb-4 text-gray-700">
        Your practical test attempt {test.owedAttempt.attemptNumber} of {test.attemptsPerCycle} was
        unsuccessful. Pay the <span className="font-semibold text-ink">{fee}</span> practical
        reattempt fee and upload the receipt. The school verifies it before your next test date is
        confirmed.
      </p>
      {test.payment?.status === 'REJECTED' && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          Your previous payment was not approved. Reason: {test.payment.rejectionReason}
        </p>
      )}
      <fieldset aria-describedby="practical-paymentMethod-error">
        <legend className="mb-3 font-semibold text-ink">
          How are you paying the {fee} reattempt fee? <span className="text-danger">*</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {paymentMethods.map(({ id, label }) => (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-3 font-semibold transition ${
                paymentMethod === id ? 'border-brand bg-brand-soft text-ink' : 'border-gray-200 bg-white text-gray-700 hover:border-brand/40'
              }`}
            >
              <input type="radio" name="practicalPaymentMethod" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="h-4 w-4 accent-brand" />
              {label}
            </label>
          ))}
        </div>
        <p id="practical-paymentMethod-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
          {showErrors ? errors.paymentMethod : undefined}
        </p>
      </fieldset>
      {MethodDetails && (
        <div className="mt-2 grid gap-6 md:grid-cols-2">
          <MethodDetails />
          <FileUpload
            id="practicalReceipt"
            label="Upload Payment Receipt / Deposit Slip"
            file={receipt}
            error={showErrors ? errors.receipt : getReceiptError(receipt)}
            onChange={setReceipt}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={busy} className="btn btn-primary !rounded-lg !px-6 !py-2.5 disabled:cursor-wait disabled:opacity-70">
          <FaMoneyBillWave aria-hidden="true" />
          {busy ? 'Submitting...' : 'Submit Payment'}
        </button>
      </div>
    </form>
  )
}

// Student-only page: the signed-in student's own practical lessons and practical test.
// Read-only apart from paying a practical reattempt fee: the school schedules lessons,
// instructors mark attendance.
function Lessons() {
  const [cycle, setCycle] = useState(undefined)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  // Always the backend's record: loaded on opening and again when the student comes back to
  // the page, so attendance marked by an instructor shows without a manual reload
  const load = useCallback(
    () =>
      getMyPractical()
        .then((loaded) => {
          setCycle(loaded.cycle)
          setError('')
        })
        .catch((loadError) => setError(loadError.message)),
    [],
  )
  useEffect(() => {
    load()
  }, [load])
  useRefetchOnFocus(load)

  const latestPayment = cycle?.payments[0]

  return (
    <>
      <DashboardWelcome title="Lessons" message="Your practical driving lessons and practical test." icon={FaCarSide} />

      {cycle === undefined ? (
        <p role={error ? 'alert' : 'status'} className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          {error || 'Loading your lessons...'}
        </p>
      ) : cycle === null ? (
        <DashboardSection title="Practical Lessons" icon={FaCarSide}>
          <p className="py-6 text-center text-gray-600" data-lessons-empty>
            Your practical lessons are not arranged yet. After you pass the driving school exam, the
            school will assign your instructors and arrange your 10 lessons. They will appear here.
          </p>
        </DashboardSection>
      ) : (
        <>
          <DashboardSection title="Practical Test" icon={FaRoad}>
            <PracticalSummary cycle={cycle} />
            {cycle.test.canPay && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <PaymentForm
                  test={cycle.test}
                  onSubmitted={(overview) => {
                    setCycle(overview.cycle)
                    setToast({ variant: 'success', message: 'Your payment has been submitted for verification.' })
                  }}
                />
              </div>
            )}
            {latestPayment && !cycle.test.canPay && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                Latest reattempt payment ({formatFee(latestPayment.feeAmount)}, attempt {latestPayment.attemptNumber}):
                <StatusBadge status={latestPayment.status} label={verificationLabels[latestPayment.status]} />
              </p>
            )}
          </DashboardSection>

          <DashboardSection title="Your Instructors" icon={FaChalkboardUser}>
            {cycle.instructors.length === 0 ? (
              <p className="text-gray-600">The school will assign your instructors soon.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {cycle.instructors.map((instructor) => (
                  <li key={instructor.id} className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="font-semibold text-ink">{instructor.name}</p>
                    <p className="text-sm text-gray-600">
                      {instructor.drivingSchoolId} · {getResponsibilityLabel(instructor.responsibility) ?? 'Vehicle not set'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection title="Lesson Schedule" icon={FaCarSide}>
            {cycle.progress.scheduled === 0 && (
              <p className="mb-4 rounded-lg bg-brand-soft px-4 py-3 text-ink">
                Your lessons have not been scheduled yet. The school will arrange the schedule and it
                will appear here.
              </p>
            )}
            <LessonScheduleTable lessons={cycle.lessons} />
          </DashboardSection>
        </>
      )}
      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default Lessons
