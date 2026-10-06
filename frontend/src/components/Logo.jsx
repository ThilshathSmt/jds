// TODO: Replace src/assets/logo/jeslan-logo.svg with the official Jeslan Driving School logo.
// If the official logo already contains the school name, pass showText={false}.
import logo from '../assets/logo/jeslan-logo.svg'

function Logo({ light = false, showText = true }) {
  return (
    <a href="#home" className="flex items-center gap-3" aria-label="Jeslan Driving School home">
      <img src={logo} alt="Jeslan Driving School logo" className="h-11 w-auto sm:h-12" />
      {showText && (
        <span className="leading-none whitespace-nowrap">
          <span
            className={`block text-xl font-extrabold tracking-wide sm:text-2xl ${light ? 'text-white' : 'text-brand'}`}
          >
            JESLAN
          </span>
          <span
            className={`mt-1 block text-[0.625rem] font-semibold tracking-[0.2em] sm:text-xs ${light ? 'text-white/80' : 'text-ink'}`}
          >
            DRIVING SCHOOL
          </span>
        </span>
      )}
    </a>
  )
}

export default Logo
