import { FaLanguage } from 'react-icons/fa6'

function LanguageSelector({ languages, selected, onChange, label }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p id="language-selector-label" className="flex items-center gap-2 font-semibold text-gray-700">
        <FaLanguage className="text-2xl text-brand" aria-hidden="true" />
        {label}
      </p>
      <div
        role="group"
        aria-labelledby="language-selector-label"
        className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-3"
      >
        {languages.map(({ code, label: languageLabel, htmlLang }) => {
          const isActive = code === selected
          return (
            <button
              key={code}
              type="button"
              lang={htmlLang}
              aria-pressed={isActive}
              onClick={() => onChange(code)}
              className={`cursor-pointer rounded-full border-2 px-3 py-2.5 font-semibold transition duration-200 sm:px-5 ${
                isActive
                  ? 'border-brand bg-brand text-white shadow-md shadow-brand/30'
                  : 'border-brand bg-white text-ink hover:bg-brand-soft'
              }`}
            >
              {languageLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LanguageSelector
