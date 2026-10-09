import { useState } from 'react'

// Shared state for the login / register forms: field values, validation errors (revealed
// after the first submit attempt) and the request sent by `onSubmit(values)`.
// `onSubmit` may reject with an error carrying `message` and optional `fieldErrors`.
function useAuthForm(initialValues, validate, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [serverErrors, setServerErrors] = useState({})

  // The browser's own checks take priority over what the server last reported
  const errors = showErrors ? { ...serverErrors, ...validate(values) } : {}

  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setServerErrors((current) => ({ ...current, [name]: undefined }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setShowErrors(true)
    if (submitting || Object.keys(validate(values)).length > 0) return

    setSubmitting(true)
    setFormError('')
    try {
      await onSubmit(values)
    } catch (error) {
      setFormError(error.message)
      setServerErrors(error.fieldErrors ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  // Props for a text-like input bound to `name`
  const inputProps = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: (event) => setField(name, event.target.value),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': `${name}-error`,
    className: `form-input ${errors[name] ? 'form-input-error' : ''}`,
  })

  return { values, errors, formError, submitting, setField, inputProps, handleSubmit }
}

export default useAuthForm
