import { FaUser } from 'react-icons/fa6'

const sizes = {
  sm: 'h-9 w-9 text-base',
  xl: 'h-32 w-32 text-5xl',
  md: 'h-12 w-12 text-xl',
  lg: 'h-24 w-24 text-4xl sm:h-28 sm:w-28 sm:text-5xl',
}

// Avatar: the uploaded profile picture (`user.avatar`, a URL) or else the role icon
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
