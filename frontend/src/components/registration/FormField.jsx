// Label + control + hint/error wrapper.
// The control passed as children should set aria-describedby={`${id}-error`} when `error` is shown.
function FormField({ id, label, required = false, error, hint, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-semibold text-ink">
        {label}
        {required && (
          <span className="text-brand" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      <div className="mt-1 flex min-h-5 justify-between gap-3 text-sm">
        <p id={`${id}-error`} role="alert" className="text-brand">
          {error}
        </p>
        {hint && <p className="shrink-0 text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}

export default FormField
