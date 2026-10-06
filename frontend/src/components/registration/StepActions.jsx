// Back / continue buttons shared by every step. The continue button submits the step's form.
function StepActions({ onBack, nextLabel = 'Save & Next', nextDisabled = false }) {
  return (
    <div className={`mt-8 flex gap-4 ${onBack ? 'justify-between' : 'justify-end'}`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="btn !rounded-lg bg-gray-200 text-ink hover:bg-gray-300"
        >
          Back
        </button>
      )}
      <button
        type="submit"
        disabled={nextDisabled}
        className="btn btn-primary !rounded-lg disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
      >
        {nextLabel}
      </button>
    </div>
  )
}

export default StepActions
