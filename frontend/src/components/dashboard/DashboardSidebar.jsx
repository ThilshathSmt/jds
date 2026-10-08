import { NavLink } from 'react-router-dom'
import ProfileSection from './ProfileSection'

// Sidebar content shared by the desktop sidebar and the mobile drawer.
// `toggle` is the button in its header: collapse on desktop, close in the drawer.
function DashboardSidebar({ panelTitle, user, menuItems, collapsed = false, toggle, onNavigate }) {
  const ToggleIcon = toggle.icon

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ink text-white">
      <div
        className={`flex h-14 shrink-0 items-center border-b border-white/10 ${collapsed ? 'justify-center' : 'justify-between pr-3 pl-5'}`}
      >
        {!collapsed && (
          <p className="text-sm font-bold tracking-[0.15em] whitespace-nowrap uppercase">
            {panelTitle}
          </p>
        )}
        <button
          type="button"
          onClick={toggle.onClick}
          aria-label={toggle.label}
          className="flex cursor-pointer items-center rounded-lg p-2 text-lg text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <ToggleIcon aria-hidden="true" />
        </button>
      </div>

      <ProfileSection user={user} collapsed={collapsed} />

      <nav aria-label={`${panelTitle} navigation`} className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {menuItems.map(({ label, to, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg py-3 font-medium transition ${collapsed ? 'justify-center px-2' : 'px-4'} ${
                    isActive
                      ? 'bg-brand text-white shadow-md shadow-black/30'
                      : 'text-white/75 hover:bg-brand/25 hover:text-white'
                  }`
                }
              >
                <Icon aria-hidden="true" className="shrink-0 text-lg" />
                <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <p className="border-t border-white/10 px-5 py-4 text-xs text-white/40">
          Jeslan Driving School
        </p>
      )}
    </div>
  )
}

export default DashboardSidebar
