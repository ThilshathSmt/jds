import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa6'
import AuthCard from '../components/auth/AuthCard'
import AuthMessage from '../components/auth/AuthMessage'
import FormField from '../components/registration/FormField'
import { requestPasswordReset } from '../services/authApi'
import { validateForgotPassword } from '../utils/authValidation'

// "Forgot your password?" from the login page: asks for the account's e-mail address. The
// answer is the same whether or not the address has an account; the backend e-mails a
// single-use reset link when it does.
function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sentMessage, setSentMessage] = useState('')
  const [formError, setFormError] = useState('')
  const errors = showErrors ? validateForgotPassword({ email }) : {}

  const submit = async (event) => {
    event.preventDefault()
    setShowErrors(true)
    if (submitting || Object.keys(validateForgotPassword({ email })).length > 0) return
    setSubmitting(true)
    setFormError('')
    try {
      setSentMessage(await requestPasswordReset(email.trim()))
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Forgot Password">
      {sentMessage ? (
        <div className="space-y-4">
          <AuthMessage>{sentMessage}</AuthMessage>
          <p className="text-sm text-gray-600">
            The link expires in 30 minutes and works once. If nothing arrives within a few
            minutes, check your spam folder or try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setSentMessage('')
              setShowErrors(false)
            }}
            className="btn w-full !rounded-lg bg-gray-100 text-ink shadow-sm hover:bg-gray-200"
          >
            Send again
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the e-mail address of your account. We will send you a link to choose a new
            password.
          </p>
          <FormField id="email" label="E-mail Address" error={errors.email}>
            <div className="relative">
              <FaEnvelope aria-hidden="true" className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setFormError('')
                }}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby="email-error"
                className={`form-input pl-11 ${errors.email ? 'form-input-error' : ''}`}
              />
            </div>
          </FormField>
          {formError && <AuthMessage variant="error">{formError}</AuthMessage>}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full !rounded-lg disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Please wait...' : 'Send Reset Link'}
          </button>
        </form>
      )}
      <p className="pt-6 text-center">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-brand">
          <FaArrowLeft aria-hidden="true" />
          Back to Login
        </Link>
      </p>
    </AuthCard>
  )
}

export default ForgotPassword
