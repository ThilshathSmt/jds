import { useState } from 'react'

// Shared state for the login / register forms: field values, validation errors
// (revealed after the first submit attempt) and whether the last submit was valid.
function useAuthForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues)
  const [showErrors, setShowErrors] = useState(false)
  const [isValidSubmit, setIsValidSubmit] = useState(false)

  const errors = showErrors ? validate(values) : {}

  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setIsValidSubmit(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setShowErrors(true)
    // No API call here: the forms only report whether the input is valid
    setIsValidSubmit(Object.keys(validate(values)).length === 0)
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

  return { values, errors, isValidSubmit, setField, inputProps, handleSubmit }
}

export default useAuthForm
