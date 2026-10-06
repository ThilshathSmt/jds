import { FaEnvelope, FaLocationDot, FaPhone } from 'react-icons/fa6'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import { contactInfo, footerLinkGroups, legalLinks, socialLinks } from '../data/siteData'

const headingClass = 'mb-4 text-lg font-semibold text-white'
const linkClass = 'transition hover:text-white'

function Footer() {
  return (
    <footer id="contact" className="border-t-4 border-brand bg-ink text-gray-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs">&ldquo;Drive With Confidence, Learn With Us!&rdquo;</p>
          <ul className="mt-6 flex gap-3">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-brand"
                >
                  <Icon aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {footerLinkGroups.map(({ title, links }) => (
          <nav key={title} aria-label={title}>
            <h2 className={headingClass}>{title}</h2>
            <ul className="space-y-2.5">
              {links.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className={headingClass}>Contact</h2>
          <ul className="space-y-3">
            {contactInfo.areas.map((area) => (
              <li key={area} className="flex items-center gap-3">
                <FaLocationDot className="shrink-0 text-brand" aria-hidden="true" />
                {area}
              </li>
            ))}
            <li className="flex items-center gap-3">
              <FaPhone className="shrink-0 text-brand" aria-hidden="true" />
              {contactInfo.hotline}
            </li>
            <li className="flex items-center gap-3">
              <FaEnvelope className="shrink-0 text-brand" aria-hidden="true" />
              <span className="break-all">{contactInfo.email}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-brand-deep text-sm text-white/85">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-4 text-center sm:flex-row sm:text-left">
          <p>&copy; 2026 Jeslan Driving School. All Rights Reserved.</p>
          <ul className="flex gap-4">
            {legalLinks.map(({ label, href }) => (
              <li key={label}>
                <a href={href} className={linkClass}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default Footer
