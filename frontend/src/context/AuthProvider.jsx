import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './useAuth'
import * as authApi from '../services/authApi'

// Holds the signed-in user for the whole app. The session itself is an httpOnly cookie
// managed by the backend, so on load we ask the backend who (if anyone) is signed in.
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authApi.fetchCurrentUser().then((currentUser) => {
      if (!active) return
      setUser(currentUser)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const auth = useMemo(
    () => ({
      user,
      loading,
      login: async (credentials) => {
        const signedInUser = await authApi.login(credentials)
        setUser(signedInUser)
        return signedInUser
      },
      register: authApi.register,
      logout: async () => {
        // Sign out locally even if the request fails, so the UI never stays "logged in"
        await authApi.logout().catch(() => {})
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext value={auth}>{children}</AuthContext>
}

export default AuthProvider
