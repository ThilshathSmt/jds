import { useState } from 'react'
import { FaArrowsRotate } from 'react-icons/fa6'

// Stand-in for Google reCAPTCHA: the box must be ticked where a form requires it (account
// registration passes `checked` / `onChange` / `error`), but the tick is not verified by any
// CAPTCHA service. Login still uses it on its own, as before.
// TODO: Replace with real Google reCAPTCHA (site key + server-side verification)
function CaptchaPlaceholder({ checked: controlledChecked, onChange, error }) {
  const [ownChecked, setOwnChecked] = useState(false)
  const controlled = controlledChecked !== undefined
  const checked = controlled ? controlledChecked : ownChecked

  return (
    <div>
    <div className={`mx-auto flex w-full max-w-xs items-center justify-between gap-4 rounded border bg-gray-50 px-4 py-3 shadow-sm ${error ? 'border-danger' : 'border-gray-300'}`}>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => (controlled ? onChange(event.target.checked) : setOwnChecked(event.target.checked))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'captcha-error' : undefined}
          className="h-6 w-6 shrink-0 accent-brand"
        />
        I&apos;m not a robot
      </label>
      <div className="flex flex-col items-center gap-1 text-gray-500" aria-hidden="true">
        <FaArrowsRotate className="text-2xl text-gray-400" />
        <span className="text-[0.625rem]">reCAPTCHA</span>
      </div>
    </div>
    {error && (
      <p id="captcha-error" role="alert" className="mt-1 text-center text-sm text-danger">
        {error}
      </p>
    )}
    </div>
  )
}

export default CaptchaPlaceholder
