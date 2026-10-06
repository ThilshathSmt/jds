import AuthActions from './AuthActions'
import AuthMessage from './AuthMessage'
import CaptchaPlaceholder from './CaptchaPlaceholder'
import useAuthForm from './useAuthForm'
import FormField from '../registration/FormField'
import { validateLogin } from '../../utils/authValidation'

const initialValues = { schoolId: '', password: '', keepSignedIn: false }

function LoginForm() {
  // TODO: On a valid submit, call the backend login API and redirect to the Student Portal.
  const { values, errors, isValidSubmit, setField, inputProps, handleSubmit } = useAuthForm(
    initialValues,
    validateLogin,
  )

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
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

      {isValidSubmit && (
        <AuthMessage>Login form is valid. Backend login will be connected later.</AuthMessage>
      )}

      <AuthActions submitLabel="Login" switchLabel="Register" switchTo="/register" />

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
