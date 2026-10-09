import { Navigate } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../../context/useAuth'

// For the login / register pages: someone already signed in goes straight to their dashboard
function GuestRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to={getDashboardPath(user)} replace /> : children
}

export default GuestRoute
