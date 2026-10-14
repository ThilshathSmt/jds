import { useState } from 'react'
import RegistrationHeader from '../components/registration/RegistrationHeader'
import RegistrationProgress from '../components/registration/RegistrationProgress'
import PersonalDetailsStep from '../components/registration/PersonalDetailsStep'
import PackageDetailsStep from '../components/registration/PackageDetailsStep'
import PaymentDetailsStep from '../components/registration/PaymentDetailsStep'
import RegistrationSuccess from '../components/registration/RegistrationSuccess'
import { getQuotedMinimumPayment } from '../data/registrationData'
import { submitApplication } from '../services/applicationApi'
import { TERMS_CHANGED } from '../services/settingsApi'
import { validateStep1, validateStep2, validateStep3 } from '../utils/registrationValidation'
import useRegistrationOptions from '../utils/useRegistrationOptions'

const stepValidators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 }
const stepComponents = { 1: PersonalDetailsStep, 2: PackageDetailsStep, 3: PaymentDetailsStep }
const LAST_STEP = 3
const PACKAGE_STEP = 2

const initialFormData = {
  fullName: '',
  mobile: '',
  email: '',
  nic: '',
  address: '',
  packageId: '',
  paymentMethod: '',
  receipt: null,
}

function Registration() {
  const { options, error: optionsError, reload } = useRegistrationOptions()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(initialFormData)
  // Steps 2 and 3 reveal their errors only after a failed attempt to continue
  const [showErrors, setShowErrors] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // A package chosen earlier that is no longer offered (after a reload) counts as not chosen
  const packageOffered = options?.packages.some(({ id }) => id === formData.packageId) ?? false
  const effectiveData = packageOffered ? formData : { ...formData, packageId: '' }
  const errors = stepValidators[currentStep](effectiveData)
  const StepComponent = stepComponents[currentStep]

  const updateField = (field, value) => setFormData((data) => ({ ...data, [field]: value }))

  const goToStep = (step) => {
    setCurrentStep(step)
    setShowErrors(false)
    window.scrollTo({ top: 0 })
  }

  const handleNext = async () => {
    if (submitting) return
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      // The chosen package has been withdrawn: choose again
      if (currentStep > PACKAGE_STEP && !packageOffered) goToStep(PACKAGE_STEP)
      return
    }
    if (currentStep < LAST_STEP) {
      goToStep(currentStep + 1)
      return
    }

    // Final step: send the application to the backend. This does not create a login
    // account; the school reviews the application first.
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitApplication({
        ...formData,
        quotedMinimumPayment: getQuotedMinimumPayment(options, formData.packageId),
      })
      setSubmitted(true)
      window.scrollTo({ top: 0 })
    } catch (error) {
      setSubmitError(error.message)
      // The price or the percentage changed meanwhile: show the new amount
      if (error.code === TERMS_CHANGED || error.fieldErrors?.packageId) reload()
    } finally {
      setSubmitting(false)
    }
  }

  let content
  if (submitted) content = <RegistrationSuccess />
  else if (!options) {
    content = (
      <p role={optionsError ? 'alert' : 'status'} className="py-8 text-center text-gray-600">
        {optionsError || 'Loading registration details...'}
      </p>
    )
  } else {
    content = (
      <>
        <RegistrationHeader />
        <RegistrationProgress currentStep={currentStep} />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            handleNext()
          }}
        >
          <StepComponent
            formData={effectiveData}
            errors={errors}
            showErrors={showErrors}
            submitting={submitting}
            submitError={submitError}
            options={options}
            onChange={updateField}
            onBack={() => goToStep(currentStep - 1)}
          />
        </form>
      </>
    )
  }

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="container-page">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          {content}
        </div>
      </div>
    </section>
  )
}

export default Registration
