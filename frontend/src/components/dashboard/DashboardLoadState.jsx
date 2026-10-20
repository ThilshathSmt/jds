function DashboardLoadState({ loading, error, onRetry }) {
  if (loading) return <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600" role="status">Loading dashboard data…</div>
  if (error) return <div className="rounded-xl border border-danger/30 bg-white p-5 text-sm text-danger-dark" role="alert">{error} <button className="ml-2 font-semibold underline" onClick={onRetry}>Retry</button></div>
  return null
}

export default DashboardLoadState
