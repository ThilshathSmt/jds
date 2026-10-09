import { Navigate } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../../context/useAuth'

// Shows `children` only to a signed-in user with the given role.
// This is a convenience for navigation: the backend enforces the real access rules.
function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <p role="status" className="flex min-h-dvh items-center justify-center text-gray-600">
        Loading...
      </p>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  // Signed in with a different role: send them to their own dashboard
  if (user.role !== role) return <Navigate to={getDashboardPath(user)} replace />

  return children
}

export default ProtectedRoute
