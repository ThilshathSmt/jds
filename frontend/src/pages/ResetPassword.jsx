import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaCircleCheck, FaLock } from 'react-icons/fa6'
import AuthCard from '../components/auth/AuthCard'
import AuthMessage from '../components/auth/AuthMessage'
import PasswordInput from '../components/auth/PasswordInput'
import useAuthForm from '../components/auth/useAuthForm'
import FormField from '../components/registration/FormField'
import { checkPasswordResetLink, resetPassword } from '../services/authApi'
import { validateResetPassword } from '../utils/authValidation'

// The token from the e-mailed link (read once)
const readToken = () => new URLSearchParams(window.location.search).get('token') ?? ''

// Takes the token out of the address bar so it does not stay in the browser history or get
// copied along with the page address
const useHideTokenFromAddressBar = () => {
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
}

const linkButton = 'btn w-full !rounded-lg'

// The page a password reset e-mail links to (/reset-password?token=...). The backend checks
// the link first, then sets the new password and uses the link up.
function ResetPassword() {
  const [token] = useState(readToken)
  useHideTokenFromAddressBar()
  // 'checking' | 'ready' | 'invalid' | 'done'
  const [state, setState] = useState(token ? 'checking' : 'invalid')
  const [linkError, setLinkError] = useState(token ? '' : 'This password reset link is not valid. Please request a new one.')
  const [drivingSchoolId, setDrivingSchoolId] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!token) return
    checkPasswordResetLink(token)
      .then((details) => {
        setDrivingSchoolId(details.drivingSchoolId)
        setState('ready')
      })
      .catch((checkError) => {
        setLinkError(checkError.message)
        setState('invalid')
      })
  }, [token])

  const submit = async ({ password, confirmPassword }) => {
    try {
      setResult(await resetPassword({ token, password, confirmPassword }))
      setState('done')
    } catch (submitError) {
      // The link was used or expired while the form was open
      if (submitError.code?.startsWith('LINK_')) {
        setLinkError(submitError.message)
        setState('invalid')
        return
      }
      throw submitError
    }
  }

  const { errors, formError, submitting, inputProps, handleSubmit } = useAuthForm(
    { password: '', confirmPassword: '' },
    validateResetPassword,
    submit,
  )

  return (
    <AuthCard title="Reset Password">
      {state === 'checking' && (
        <p role="status" className="text-center text-gray-600">
          Checking your link...
        </p>
      )}

      {state === 'invalid' && (
        <div className="space-y-4">
          <AuthMessage variant="error">{linkError}</AuthMessage>
          <Link to="/forgot-password" className={`${linkButton} btn-primary`}>
            Request a New Reset Link
          </Link>
          <Link to="/login" className={`${linkButton} bg-gray-100 text-ink shadow-sm hover:bg-gray-200`}>
            Back to Login
          </Link>
        </div>
      )}

      {state === 'ready' && (
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm text-ink">
            <FaLock aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <span>
              Choose a new password for the account <strong>{drivingSchoolId}</strong>. You log in
              with this Driving School ID.
            </span>
          </p>
          <div>
            <FormField id="password" label="New Password" error={errors.password} hint="At least 8 characters">
              <PasswordInput autoComplete="new-password" required {...inputProps('password')} />
            </FormField>
            <FormField id="confirmPassword" label="Confirm New Password" error={errors.confirmPassword}>
              <PasswordInput autoComplete="new-password" required {...inputProps('confirmPassword')} />
            </FormField>
          </div>
          {formError && <AuthMessage variant="error">{formError}</AuthMessage>}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full !rounded-lg disabled:cursor-wait disabled:opacity-70"
          >
            {submitting ? 'Please wait...' : 'Reset Password'}
          </button>
        </form>
      )}

      {state === 'done' && (
        <div className="space-y-4 text-center">
          <FaCircleCheck aria-hidden="true" className="mx-auto text-5xl text-emerald-600" />
          <AuthMessage variant={result.locked ? 'error' : 'success'}>{result.message}</AuthMessage>
          {result.locked ? (
            <Link to="/reapply" state={{ schoolId: result.drivingSchoolId }} className={`${linkButton} btn-primary`}>
              Submit New Application
            </Link>
          ) : (
            <Link to="/login" className={`${linkButton} btn-primary`}>
              Return to Login
            </Link>
          )}
        </div>
      )}

      {state !== 'done' && state !== 'invalid' && (
        <p className="pt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-brand">
            <FaArrowLeft aria-hidden="true" />
            Back to Login
          </Link>
        </p>
      )}
    </AuthCard>
  )
}

export default ResetPassword
