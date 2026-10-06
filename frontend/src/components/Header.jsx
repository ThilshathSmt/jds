import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaBars, FaCircleUser, FaLocationDot, FaPhone, FaXmark } from 'react-icons/fa6'
import Logo from './Logo'
import { contactInfo, navLinks, socialLinks } from '../data/siteData'

function TopBar() {
  return (
    <div className="bg-brand-dark text-sm text-white">
      <div className="container-page flex items-center justify-between gap-4 py-2">
        <ul className="flex items-center gap-4 sm:gap-6">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <a
                href={href}
                aria-label={label}
                className="flex items-center gap-2 transition hover:text-white/75"
              >
                <Icon aria-hidden="true" />
                <span className="hidden lg:inline">{label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 font-semibold whitespace-nowrap sm:gap-8">
          <p className="hidden items-center gap-2 sm:flex">
            <FaLocationDot aria-hidden="true" />
            {contactInfo.areas.join(' | ')}
          </p>
          <p className="flex items-center gap-2">
            <FaPhone aria-hidden="true" className="sm:hidden" />
            Hotline {contactInfo.hotline}
          </p>
        </div>
      </div>
    </div>
  )
}

function NavLink({ link, onClick, mobile = false }) {
  const { label, to, icon: Icon, highlight } = link
  const current = useLocation().pathname === to
  const base = 'flex items-center gap-2 font-medium whitespace-nowrap transition'
  const layout = mobile ? 'rounded-lg px-4 py-3' : 'rounded-full px-4 py-2'
  let colors = 'text-ink hover:bg-brand-soft hover:text-brand'
  if (highlight) {
    colors = 'bg-brand text-white hover:bg-brand-dark'
    if (current) colors += ' ring-2 ring-brand/40 ring-offset-2'
  }
  else if (current) colors = 'text-brand'

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={`${base} ${layout} ${colors}`}
    >
      <Icon aria-hidden="true" />
      {label}
    </Link>
  )
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <TopBar />

      {/* Sticky main navbar: stays visible while the page scrolls */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
          <Logo />

          <nav aria-label="Main navigation" className="hidden lg:block">
            <ul className="flex items-center gap-1 lg:gap-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <NavLink link={link} />
                </li>
              ))}
              <li>
                {/* Placeholder: will open login / student account later */}
                <button
                  type="button"
                  aria-label="User account"
                  className="ml-1 flex cursor-pointer items-center rounded-full p-2 text-2xl text-ink transition hover:text-brand"
                >
                  <FaCircleUser aria-hidden="true" />
                </button>
              </li>
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="flex cursor-pointer items-center rounded-lg p-2 text-2xl text-ink transition hover:bg-brand-soft hover:text-brand lg:hidden"
          >
            {menuOpen ? <FaXmark aria-hidden="true" /> : <FaBars aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-full border-t border-gray-200 bg-white shadow-lg lg:hidden"
          >
            <ul className="container-page flex flex-col gap-1 py-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <NavLink link={link} onClick={closeMenu} mobile />
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-3 font-medium text-ink transition hover:bg-brand-soft hover:text-brand"
                >
                  <FaCircleUser aria-hidden="true" />
                  My Account
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>
    </>
  )
}

export default Header
