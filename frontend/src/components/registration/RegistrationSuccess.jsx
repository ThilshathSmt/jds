import { Link } from 'react-router-dom'
import { FaRegCircleCheck } from 'react-icons/fa6'

// Shown once the backend has stored the application. It still awaits review by the school:
// nothing has been approved and no login account exists yet.
function RegistrationSuccess() {
  return (
    <div role="status" className="py-8 text-center">
      <FaRegCircleCheck className="mx-auto text-7xl text-green-500" aria-hidden="true" />
      <h1 className="mt-6 text-3xl font-bold text-ink">THANK YOU</h1>
      <p className="mt-4 text-lg text-gray-700">The form has been successfully submitted.</p>
      <Link to="/" className="btn btn-primary mt-8">
        Back to Home
      </Link>
    </div>
  )
}

export default RegistrationSuccess
