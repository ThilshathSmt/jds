// Display formatting shared by the dashboard pages

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { dateStyle: 'medium' })

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

// 'active' -> 'Active', matching the StatusBadge styles
export const formatStatus = (status) => status.charAt(0).toUpperCase() + status.slice(1)

// 3725 -> '01:02:05'
export const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}
