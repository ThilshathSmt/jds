import UserAvatar from './UserAvatar'

// Signed-in user summary shown at the top of the sidebar
function ProfileSection({ user, collapsed = false }) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-white/10 py-5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}
    >
      <UserAvatar user={user} />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{user.name}</p>
          <p className="truncate text-sm text-white/60">{user.role}</p>
        </div>
      )}
    </div>
  )
}

export default ProfileSection
