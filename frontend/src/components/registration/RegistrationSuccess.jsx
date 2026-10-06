import { Link } from 'react-router-dom'
import { FaRegCircleCheck } from 'react-icons/fa6'

// Shown after the frontend-only submit. Nothing has been verified or approved at this point.
function RegistrationSuccess() {
  return (
    <div role="status" className="py-8 text-center">
      <FaRegCircleCheck className="mx-auto text-7xl text-green-500" aria-hidden="true" />
      <h1 className="mt-6 text-3xl font-bold text-ink">THANK YOU</h1>
      <p className="mt-4 text-gray-700">
        Your registration form has been successfully submitted.
      </p>
      <p className="mt-1 text-gray-700">Your application has been received successfully.</p>
      <Link to="/" className="btn btn-primary mt-8">
        Back to Home
      </Link>
    </div>
  )
}

export default RegistrationSuccess
