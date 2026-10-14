import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaLock } from 'react-icons/fa6'
import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import PasswordInput from './PasswordInput'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { getDashboardPath, useAuth } from '../../context/useAuth'
import { ACCOUNT_LOCKED } from '../../services/apiClient'
import { validateLogin } from '../../utils/authValidation'

const initialValues = { schoolId: '', password: '', keepSignedIn: false }

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  // Set by the register page after a successful registration
  const justRegistered = useLocation().state?.registered === true

  // The backend decides the role; the user is sent to the matching dashboard
  const signIn = async (credentials) => {
    const user = await login(credentials)
    navigate(getDashboardPath(user), { replace: true })
  }

  const { values, errors, formError, formErrorCode, submitting, setField, inputProps, handleSubmit } =
    useAuthForm(initialValues, validateLogin, signIn)

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {justRegistered && !formError && (
        <AuthMessage>Your account has been created. Please log in.</AuthMessage>
      )}

      <div>
        <FormField id="schoolId" label="Driving School Id" error={errors.schoolId}>
          <input type="text" autoComplete="username" required {...inputProps('schoolId')} />
        </FormField>
        <FormField id="password" label="Password" error={errors.password}>
          <PasswordInput autoComplete="current-password" required {...inputProps('password')} />
        </FormField>
      </div>

      <CaptchaPlaceholder />

      <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.keepSignedIn}
          onChange={(event) => setField('keepSignedIn', event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Keep me signed in
      </label>

      {/* Locked after three failed examination attempts: the backend refused the login and
          says why. The way back in is a new application, for the same account. */}
      {formErrorCode === ACCOUNT_LOCKED ? (
        <div role="alert" data-account-locked className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-4 text-danger-dark">
          <p className="flex items-center gap-2 font-bold">
            <FaLock aria-hidden="true" />
            Your account is temporarily locked
          </p>
          <p className="mt-2 text-sm">
            You have used all three examination attempts. Submit a new registration application
            with a new medical report. Your account will be reactivated after admin approval.
          </p>
          <Link
            to="/reapply"
            state={{ schoolId: values.schoolId }}
            className="btn btn-primary mt-4 !rounded-lg !px-5 !py-2"
          >
            Submit New Application
          </Link>
        </div>
      ) : (
        formError && <AuthMessage variant="error">{formError}</AuthMessage>
      )}

      <AuthActions
        submitLabel="Login"
        switchLabel="Register"
        switchTo="/register"
        submitting={submitting}
      />

      <p className="pt-2 text-center">
        {/* TODO: Implement forgot-password flow with backend later */}
        <button
          type="button"
          className="cursor-pointer text-sm text-gray-600 underline-offset-4 transition hover:text-brand hover:underline"
        >
          Forgot your password?
        </button>
      </p>
    </form>
  )
}

export default LoginForm
