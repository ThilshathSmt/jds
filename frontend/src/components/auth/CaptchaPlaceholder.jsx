import { useState } from 'react'
import { FaArrowsRotate } from 'react-icons/fa6'

// Visual stand-in only: ticking the box verifies nothing and is not part of form validation.
// TODO: Replace with real Google reCAPTCHA during backend/security integration
function CaptchaPlaceholder() {
  const [checked, setChecked] = useState(false)

  return (
    <div className="mx-auto flex w-full max-w-xs items-center justify-between gap-4 rounded border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm">
      <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="h-6 w-6 shrink-0 accent-brand"
        />
        I&apos;m not a robot
      </label>
      <div className="flex flex-col items-center gap-1 text-gray-500" aria-hidden="true">
        <FaArrowsRotate className="text-2xl text-gray-400" />
        <span className="text-[0.625rem]">reCAPTCHA</span>
      </div>
    </div>
  )
}

export default CaptchaPlaceholder
