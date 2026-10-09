import { useLocation, useNavigate } from 'react-router-dom'
import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { getDashboardPath, useAuth } from '../../context/useAuth'
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

  const { values, errors, formError, submitting, setField, inputProps, handleSubmit } =
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
          <input
            type="password"
            autoComplete="current-password"
            required
            {...inputProps('password')}
          />
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

      {formError && <AuthMessage variant="error">{formError}</AuthMessage>}

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
