import { useNavigate } from 'react-router-dom'
import { FaBars, FaBell, FaMagnifyingGlass, FaRightFromBracket } from 'react-icons/fa6'
import Logo from '../Logo'
import UserAvatar from './UserAvatar'
import { useAuth } from '../../context/useAuth'

const iconButton =
  'relative flex cursor-pointer items-center rounded-full p-2.5 text-lg text-white transition hover:bg-white/15'

function DashboardHeader({ panelTitle, user, menuOpen, onMenuClick }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-brand-deep via-brand-dark to-brand text-white shadow-md">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="dashboard-drawer"
            className={`${iconButton} lg:hidden`}
          >
            <FaBars aria-hidden="true" />
          </button>
          {/* Compact logo while the sidebar is a drawer, full logo on desktop */}
          <span className="lg:hidden">
            <Logo light showText={false} />
          </span>
          <span className="hidden lg:block">
            <Logo light />
          </span>
          <p className="hidden font-semibold whitespace-nowrap sm:block lg:border-l lg:border-white/30 lg:pl-4">
            {panelTitle}
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* UI only for now. TODO: Connect to a search feature */}
          <form role="search" onSubmit={(event) => event.preventDefault()} className="hidden md:block">
            <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-ink focus-within:ring-2 focus-within:ring-white/60">
              <FaMagnifyingGlass aria-hidden="true" className="text-gray-500" />
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder="Search..."
                className="w-36 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none lg:w-56"
              />
            </label>
          </form>
          <button type="button" aria-label="Search" className={`${iconButton} md:hidden`}>
            <FaMagnifyingGlass aria-hidden="true" />
          </button>

          {/* UI only for now. TODO: Connect to real notifications */}
          <button type="button" aria-label="Notifications" className={iconButton}>
            <FaBell aria-hidden="true" />
            <span
              className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-brand-dark"
              aria-hidden="true"
            />
          </button>

          {/* TODO: Link to the profile page once it exists */}
          <div className="flex items-center gap-2 px-1 sm:px-2">
            <UserAvatar user={user} size="sm" />
            <div className="hidden leading-tight lg:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-white/70">{user.role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/40 p-2.5 text-sm font-semibold whitespace-nowrap transition hover:bg-white hover:text-brand sm:px-4 sm:py-2"
          >
            <FaRightFromBracket aria-hidden="true" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
