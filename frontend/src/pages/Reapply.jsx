import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FaCircleCheck,
  FaCircleInfo,
  FaFileMedical,
  FaHourglassHalf,
  FaIdCard,
  FaLock,
  FaTriangleExclamation,
  FaUser,
} from 'react-icons/fa6'
import ConfirmDialog from '../components/admin/ConfirmDialog'
import PasswordInput from '../components/auth/PasswordInput'
import FormField from '../components/registration/FormField'
import PackageDetailsStep from '../components/registration/PackageDetailsStep'
import PaymentDetailsStep from '../components/registration/PaymentDetailsStep'
import PersonalDetailsStep from '../components/registration/PersonalDetailsStep'
import RegistrationProgress from '../components/registration/RegistrationProgress'
import StepActions from '../components/registration/StepActions'
import { getReapplicationStatus, submitReapplication } from '../services/reapplicationApi'
import { formatDateTime } from '../utils/formatUtils'
import {
  validateStep1,
  validateStep2,
  validateStep3,
} from '../utils/registrationValidation'

const cardClass = 'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8'
const sectionTitle = 'mb-4 flex items-center gap-3 text-lg font-bold text-ink'

const emptyDetails = { fullName: '', mobile: '', email: '', nic: '', address: '' }

// Step 1: the student proves who they are. A locked account cannot log in, so the
// Driving School ID and password are checked by the backend here instead, and nothing
// about the account is shown without them. `onVerified(credentials, status)`.
function VerifyForm({ initialSchoolId, onVerified }) {
  const [drivingSchoolId, setDrivingSchoolId] = useState(initialSchoolId)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!drivingSchoolId.trim() || !password) {
      setError({ message: 'Enter your Driving School ID and password.' })
      return
    }
    setBusy(true)
    setError(null)
    try {
      const credentials = { drivingSchoolId: drivingSchoolId.trim(), password }
      onVerified(credentials, await getReapplicationStatus(credentials))
    } catch (verifyError) {
      // 409: the account is not locked, so there is nothing to reapply for
      setError({ message: verifyError.message, notLocked: verifyError.status === 409 })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className={cardClass}>
      <h2 className={sectionTitle}>
        <FaIdCard aria-hidden="true" className="text-brand" />
        Confirm your account
      </h2>
      <p className="mb-5 text-gray-700">
        Enter the Driving School ID and password of your existing account. Your new application
        is added to that account: you keep the same Driving School ID.
      </p>
      <FormField id="reapplySchoolId" label="Driving School Id" required>
        <input
          id="reapplySchoolId"
          type="text"
          autoComplete="username"
          value={drivingSchoolId}
          onChange={(event) => setDrivingSchoolId(event.target.value)}
          className="form-input"
        />
      </FormField>
      <FormField id="reapplyPassword" label="Password" required>
        <PasswordInput
          id="reapplyPassword"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="form-input"
        />
      </FormField>

      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger-dark">
          {error.message}{' '}
          {error.notLocked && (
            <Link to="/login" className="font-semibold underline">
              Go to Login
            </Link>
          )}
        </p>
      )}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary !rounded-lg !px-6 !py-2.5 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Checking...' : 'Continue'}
        </button>
      </div>
    </form>
  )
}

// The steps of the new application after the account is confirmed. Details, package and
// payment are the Apply Now form's own steps; the new medical report comes in between.
const steps = [
  { id: 1, label: 'Your Details' },
  { id: 2, label: 'Medical Report' },
  { id: 3, label: 'Package Details' },
  { id: 4, label: 'Payment Details' },
]
const LAST_STEP = steps.length

// The answer to "Have you obtained a new medical report?": '' until chosen, then 'yes' or
// 'no'. Only an explicit yes continues; the backend checks the same answer again.
export const MEDICAL_REPORT_NOT_OBTAINED =
  'Please obtain a new medical report before continuing with your reapplication.'

const validateMedicalReport = ({ newMedicalReportConfirmed }) => {
  if (newMedicalReportConfirmed === 'yes') return {}
  if (newMedicalReportConfirmed === 'no') return { newMedicalReportConfirmed: MEDICAL_REPORT_NOT_OBTAINED }
  return { newMedicalReportConfirmed: 'Please answer whether you have obtained a new medical report.' }
}

const medicalReportOptions = [
  { value: 'yes', label: 'Yes, I have obtained a new medical report.' },
  { value: 'no', label: 'No, I have not obtained a new medical report.' },
]

const stepValidators = {
  1: validateStep1,
  2: validateMedicalReport,
  3: validateStep2,
  4: validateStep3,
}

// Step 2: the student confirms they have obtained a new medical report, required after
// every exhausted cycle. The report itself is checked by the school, not uploaded here.
function MedicalReportStep({ formData, errors, attemptsPerCycle, onChange, onBack }) {
  const answer = formData.newMedicalReportConfirmed
  // "No" is explained at once; an unanswered question only keeps the button disabled
  const error = answer === 'no' ? errors.newMedicalReportConfirmed : undefined
  return (
    <>
      <p className="mb-5 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-ink">
        <FaFileMedical aria-hidden="true" className="mt-1 shrink-0 text-brand" />
        A new medical report is required after {attemptsPerCycle} unsuccessful examination
        attempts. The school verifies it with your application.
      </p>
      <fieldset aria-describedby="newMedicalReportConfirmed-error">
        <legend className="mb-3 font-semibold text-ink">
          Have you obtained a new medical report?
          <span className="text-brand" aria-hidden="true">
            {' '}
            *
          </span>
        </legend>
        <div className="space-y-3">
          {medicalReportOptions.map(({ value, label }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                answer === value ? 'border-brand bg-brand-soft' : 'border-gray-200 bg-white hover:border-brand/40'
              }`}
            >
              <input
                type="radio"
                name="newMedicalReportConfirmed"
                value={value}
                checked={answer === value}
                onChange={() => onChange('newMedicalReportConfirmed', value)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
              <span className="font-medium text-ink">{label}</span>
            </label>
          ))}
        </div>
        <p id="newMedicalReportConfirmed-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
          {error}
        </p>
      </fieldset>
      {!answer && (
        <p className="mt-2 text-right text-sm text-gray-500">Answer the question to continue.</p>
      )}
      <StepActions onBack={onBack} nextDisabled={answer !== 'yes'} />
    </>
  )
}

const stepComponents = {
  1: PersonalDetailsStep,
  2: MedicalReportStep,
  3: PackageDetailsStep,
  4: PaymentDetailsStep,
}

// The new registration application, like a first-time one: details (started from what the
// student gave before), a new medical report confirmation, a package and the normal registration
// payment for it. No examination reattempt fee is part of it.
// `onSubmitted(status)` receives the new status.
function ReapplicationForm({ credentials, status, onSubmitted }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    ...emptyDetails,
    ...status.details,
    // Never assumed: the student must choose
    newMedicalReportConfirmed: '',
    packageId: '',
    paymentMethod: '',
    receipt: null,
  })
  // Steps 2 to 4 reveal their errors only after a failed attempt to continue
  const [showErrors, setShowErrors] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const errors = stepValidators[currentStep](formData)
  const StepComponent = stepComponents[currentStep]

  const updateField = (field, value) => {
    setFormData((data) => ({ ...data, [field]: value }))
    setSubmitError('')
  }

  const goToStep = (step) => {
    setCurrentStep(step)
    setShowErrors(false)
    window.scrollTo({ top: 0 })
  }

  const handleNext = () => {
    if (submitting) return
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    if (currentStep < LAST_STEP) goToStep(currentStep + 1)
    else setConfirming(true)
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      onSubmitted(await submitReapplication({ credentials, formData }))
    } catch (error) {
      setConfirming(false)
      // A field the server refused may be on an earlier step: name it in the message
      const fieldMessages = Object.values(error.fieldErrors ?? {})
      setSubmitError(fieldMessages.length > 0 ? `${error.message} ${fieldMessages.join(' ')}` : error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={cardClass}>
      <h2 className={sectionTitle}>
        <FaUser aria-hidden="true" className="text-brand" />
        New Registration Application
      </h2>
      <p className="text-sm text-gray-600">
        {currentStep === 1
          ? 'These are the details from your previous application. Check them and correct anything that has changed.'
          : 'Complete each step as you would for a new registration. Your Driving School ID stays the same.'}
      </p>
      <RegistrationProgress currentStep={currentStep} steps={steps} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          handleNext()
        }}
      >
        <StepComponent
          formData={formData}
          errors={errors}
          showErrors={showErrors}
          submitting={submitting}
          submitError={submitError}
          attemptsPerCycle={status.attemptsPerCycle}
          submitLabel="Submit New Application"
          onChange={updateField}
          onBack={() => goToStep(currentStep - 1)}
        />
      </form>

      {confirming && (
        <ConfirmDialog
          title="Submit new application?"
          message={`Your new application will be sent to the school for review with your confirmation of a new medical report and your registration payment receipt. Your account ${status.student.drivingSchoolId} stays locked until the school approves it.`}
          confirmLabel="Submit"
          busy={submitting}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}

// Public page for a student whose account is locked after three failed examination
// attempts: submit a new registration application for the same account and follow it.
// Nothing here unlocks anything: only an admin's approval does, on the backend.
function Reapply() {
  const location = useLocation()
  // { credentials, status } once the Driving School ID and password have been checked
  const [verified, setVerified] = useState(null)
  // Set after a submission on this visit, to show the confirmation message
  const [justSubmitted, setJustSubmitted] = useState(false)

  const status = verified?.status
  const application = status?.application

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="container-page">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className={`${cardClass} border-l-4 border-l-danger`}>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold text-ink sm:text-3xl">
              <FaLock aria-hidden="true" className="shrink-0 text-danger" />
              Your account is temporarily locked
            </h1>
            <p className="mt-3 text-gray-700">
              You have used all three examination attempts. Submit a new registration application
              with a new medical report, choose a package and make the registration payment. Your
              account will be reactivated after admin approval.
            </p>
            {status && (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Student</dt>
                  <dd data-reapply="student" className="mt-1 font-bold text-ink">
                    {status.student.name}
                  </dd>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Driving School ID (you keep this)
                  </dt>
                  <dd data-reapply="drivingSchoolId" className="mt-1 font-bold text-ink">
                    {status.student.drivingSchoolId}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {!verified ? (
            <VerifyForm
              initialSchoolId={location.state?.schoolId ?? ''}
              onVerified={(credentials, loaded) => setVerified({ credentials, status: loaded })}
            />
          ) : status.applicationStatus === 'NEW' ? (
            <div className={cardClass} data-reapply-status="NEW">
              <h2 className={sectionTitle}>
                <FaHourglassHalf aria-hidden="true" className="text-brand" />
                Application Awaiting Review
              </h2>
              <p
                role="status"
                className={`flex items-start gap-3 rounded-lg px-4 py-3 font-medium ${
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
                  ? 'Your new application has been submitted.'
                  : 'Your new application is awaiting review by the school.'}{' '}
                Your account stays locked until it is approved. After approval, log in with the
                same Driving School ID and password.
              </p>
              <dl className="mt-4 divide-y divide-gray-100">
                <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm font-medium text-gray-500">Application</dt>
                  <dd className="font-medium text-ink">#{application.id}</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="font-medium text-ink">Pending review</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                  <dd className="font-medium text-ink">{formatDateTime(application.createdAt)}</dd>
                </div>
                <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="text-sm font-medium text-gray-500">Account</dt>
                  <dd className="font-medium text-ink">Locked</dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              {status.applicationStatus === 'REJECTED' && (
                <div
                  role="alert"
                  data-reapply-status="REJECTED"
                  className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-danger-dark"
                >
                  <p className="flex items-start gap-3 font-bold">
                    <FaTriangleExclamation aria-hidden="true" className="mt-1 shrink-0" />
                    Your previous application (#{application.id}) was not approved. Your account
                    stays locked.
                  </p>
                  <p className="mt-2 pl-7 text-sm">
                    <span className="font-semibold">Reason given by the school:</span>{' '}
                    {application.rejectionReason}
                  </p>
                  <p className="mt-1 pl-7 text-sm">You can submit a new application below.</p>
                </div>
              )}
              <ReapplicationForm
                credentials={verified.credentials}
                status={status}
                onSubmitted={(updated) => {
                  setJustSubmitted(true)
                  setVerified((current) => ({ ...current, status: updated }))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default Reapply
