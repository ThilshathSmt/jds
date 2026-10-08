function ProgressBar({ value, label = 'Progress' }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 min-w-20 flex-1 overflow-hidden rounded-full bg-gray-200"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-ink">{value}%</span>
    </div>
  )
}

export default ProgressBar
