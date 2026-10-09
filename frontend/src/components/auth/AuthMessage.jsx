const variants = {
  success: { role: 'status', className: 'border-green-200 bg-green-50 text-green-800' },
  error: { role: 'alert', className: 'border-brand/30 bg-brand-soft text-brand-dark' },
}

// Notice shown above the form buttons, e.g. a failed login or a completed registration
function AuthMessage({ variant = 'success', children }) {
  const { role, className } = variants[variant]
  return (
    <p role={role} className={`rounded-lg border px-4 py-3 text-sm ${className}`}>
      {children}
    </p>
  )
}

export default AuthMessage
