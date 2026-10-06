import { registrationSteps } from '../../data/registrationData'

function RegistrationProgress({ currentStep }) {
  return (
    <ol className="my-8 flex" aria-label="Registration progress">
      {registrationSteps.map(({ id, label }, index) => {
        const reached = id <= currentStep
        return (
          <li
            key={id}
            aria-current={id === currentStep ? 'step' : undefined}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {/* Connector from the previous step's dot to this one */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-2 right-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-300 ${
                  reached ? 'bg-brand' : 'bg-gray-300'
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 h-4 w-4 rounded-full border-2 transition-colors duration-300 ${
                reached ? 'border-brand bg-brand' : 'border-gray-300 bg-white'
              }`}
            />
            <span
              className={`text-center text-xs font-medium sm:text-sm ${
                reached ? 'text-brand' : 'text-gray-500'
              }`}
            >
              {label}
              {id < currentStep && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default RegistrationProgress
