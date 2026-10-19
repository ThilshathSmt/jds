import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './useAuth'
import { onAccountLocked } from '../services/apiClient'
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

  // The account was locked while the student was signed in (a third failed examination
  // attempt was recorded): the backend now refuses every request, so leave the panel and
  // show what to do next. The page is loaded afresh, which also drops everything it held.
  useEffect(() => {
    onAccountLocked(() => {
      if (!window.location.pathname.startsWith('/reapply')) window.location.assign('/reapply')
    })
    return () => onAccountLocked(null)
  }, [])

  // After the Settings page saved the profile: the header and sidebar show it at once
  const updateUser = useCallback(
    (changes) => setUser((current) => (current ? { ...current, ...changes } : current)),
    [],
  )

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
      updateUser,
      logout: async () => {
        // Sign out locally even if the request fails, so the UI never stays "logged in"
        await authApi.logout().catch(() => {})
        setUser(null)
      },
    }),
    [user, loading, updateUser],
  )

  return <AuthContext value={auth}>{children}</AuthContext>
}

export default AuthProvider
