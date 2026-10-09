import { Link } from 'react-router-dom'

// Primary submit button plus the secondary link that switches between login and register
function AuthActions({ submitLabel, switchLabel, switchTo, submitting = false }) {
  return (
    <div className="space-y-3">
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary w-full !rounded-lg disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? 'Please wait...' : submitLabel}
      </button>
      <Link
        to={switchTo}
        className="btn w-full !rounded-lg bg-gray-100 text-ink shadow-sm hover:bg-gray-200"
      >
        {switchLabel}
      </Link>
    </div>
  )
}

export default AuthActions
