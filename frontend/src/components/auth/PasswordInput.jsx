import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa6'

// Password <input> with an eye button that shows or hides what was typed.
// Takes the same props as an <input>; `type` is managed here.
function PasswordInput({ className = '', ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...inputProps} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-4 text-gray-500 transition hover:text-brand"
      >
        {visible ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
      </button>
    </div>
  )
}

export default PasswordInput
