// Display formatting shared by the admin pages

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { dateStyle: 'medium' })

export const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

// 'active' -> 'Active', matching the StatusBadge styles
export const formatStatus = (status) => status.charAt(0).toUpperCase() + status.slice(1)
