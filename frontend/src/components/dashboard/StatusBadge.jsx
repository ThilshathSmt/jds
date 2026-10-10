const styles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Inactive: 'bg-gray-100 text-gray-600 ring-gray-500/30',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Completed: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Cancelled: 'bg-brand-soft text-brand-dark ring-brand/20',
  // Registration application statuses
  NEW: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SUSPENDED: 'bg-brand-soft text-brand-dark ring-brand/20',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${styles[status] ?? styles.Completed}`}
    >
      {status}
    </span>
  )
}

export default StatusBadge
