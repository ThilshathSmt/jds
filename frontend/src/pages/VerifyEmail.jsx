import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaCircleCheck } from 'react-icons/fa6'
import AuthCard from '../components/auth/AuthCard'
import AuthMessage from '../components/auth/AuthMessage'
import { getDashboardPath, useAuth } from '../context/useAuth'
import { verifyEmailChange } from '../services/authApi'

// The token from the e-mailed link (read once)
const readToken = () => new URLSearchParams(window.location.search).get('token') ?? ''

// Takes the token out of the address bar so it does not stay in the browser history or get
// copied along with the page address
const useHideTokenFromAddressBar = () => {
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
}

// The page an e-mail change confirmation links to (/verify-email?token=...). Opening it
// confirms the new address; no login is needed (the link was sent to that address).
function VerifyEmail() {
  const { user, updateUser } = useAuth()
  const [token] = useState(readToken)
  useHideTokenFromAddressBar()
  const [result, setResult] = useState(
    token ? null : { ok: false, message: 'This e-mail confirmation link is not valid.' },
  )
  // The link works once: it is sent once, even when React runs the effect twice (dev mode)
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true
    verifyEmailChange(token)
      .then(({ email, message }) => {
        setResult({ ok: true, message })
        // The same browser may be signed in to the account: show the new address there too
        updateUser({ email })
      })
      .catch((verifyError) => setResult({ ok: false, message: verifyError.message }))
  }, [token, updateUser])

  return (
    <AuthCard title="Confirm E-mail Address">
      {!result ? (
        <p role="status" className="text-center text-gray-600">
          Confirming your e-mail address...
        </p>
      ) : (
        <div className="space-y-4 text-center">
          {result.ok && <FaCircleCheck aria-hidden="true" className="mx-auto text-5xl text-emerald-600" />}
          <AuthMessage variant={result.ok ? 'success' : 'error'}>{result.message}</AuthMessage>
          <Link
            to={user ? `${getDashboardPath(user)}/settings` : '/login'}
            className="btn btn-primary w-full !rounded-lg"
          >
            {user ? 'Go to Settings' : 'Go to Login'}
          </Link>
        </div>
      )}
    </AuthCard>
  )
}

export default VerifyEmail
