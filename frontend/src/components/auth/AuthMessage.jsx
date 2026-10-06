// Temporary confirmation shown when a form passes frontend validation
function AuthMessage({ children }) {
  return (
    <p
      role="status"
      className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
    >
      {children}
    </p>
  )
}

export default AuthMessage
