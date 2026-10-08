import { FaUser } from 'react-icons/fa6'

const sizes = {
  sm: 'h-9 w-9 text-base',
  md: 'h-12 w-12 text-xl',
  lg: 'h-24 w-24 text-4xl sm:h-28 sm:w-28 sm:text-5xl',
}

// Generic avatar: shows `user.avatar` once real profile pictures exist, otherwise a role icon.
// TODO: Replace the placeholder with the user's uploaded profile picture
function UserAvatar({ user, size = 'md', className = '' }) {
  const Icon = user.icon ?? FaUser
  const shape = `shrink-0 rounded-full ring-2 ring-white/70 ${sizes[size]} ${className}`

  if (user.avatar) {
    return <img src={user.avatar} alt={`${user.name} profile`} className={`object-cover ${shape}`} />
  }
  return (
    <span
      role="img"
      aria-label={`${user.name} profile picture`}
      className={`flex items-center justify-center bg-brand-soft text-brand ${shape}`}
    >
      <Icon aria-hidden="true" />
    </span>
  )
}

export default UserAvatar
