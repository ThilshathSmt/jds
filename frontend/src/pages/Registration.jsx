import { useState } from 'react'
import RegistrationHeader from '../components/registration/RegistrationHeader'
import RegistrationProgress from '../components/registration/RegistrationProgress'
import PersonalDetailsStep from '../components/registration/PersonalDetailsStep'
import PackageDetailsStep from '../components/registration/PackageDetailsStep'
import PaymentDetailsStep from '../components/registration/PaymentDetailsStep'
import RegistrationSuccess from '../components/registration/RegistrationSuccess'
import { submitApplication } from '../services/applicationApi'
import { validateStep1, validateStep2, validateStep3 } from '../utils/registrationValidation'

const stepValidators = { 1: validateStep1, 2: validateStep2, 3: validateStep3 }
const stepComponents = { 1: PersonalDetailsStep, 2: PackageDetailsStep, 3: PaymentDetailsStep }
const LAST_STEP = 3

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
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(initialFormData)
  // Steps 2 and 3 reveal their errors only after a failed attempt to continue
  const [showErrors, setShowErrors] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const errors = stepValidators[currentStep](formData)
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
      await submitApplication(formData)
      setSubmitted(true)
      window.scrollTo({ top: 0 })
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="container-page">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
          {submitted ? (
            <RegistrationSuccess />
          ) : (
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
                  formData={formData}
                  errors={errors}
                  showErrors={showErrors}
                  submitting={submitting}
                  submitError={submitError}
                  onChange={updateField}
                  onBack={() => goToStep(currentStep - 1)}
                />
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default Registration
