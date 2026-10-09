import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { user, loading, login, register, logout } from the nearest AuthProvider
export const useAuth = () => {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}

// Where each role lands after login. The role always comes from the backend.
export const DASHBOARD_PATHS = {
  admin: '/admin-dashboard',
  student: '/student-dashboard',
  instructor: '/instructor-dashboard',
}

export const getDashboardPath = (user) => DASHBOARD_PATHS[user?.role] ?? '/'
