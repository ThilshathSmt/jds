import { getLanguage } from '../../data/examPapersData'
import { formatText, pickText } from '../../data/examPracticeText'

// One practice question: its road sign, the question and four radio-button answers.
// `selectedOptionId` / `onSelect(optionId)` use option ids, so the choice does not depend
// on the order the options are shown in. Nothing here knows the correct answer.
function PracticeQuestion({ question, total, language, sourceLanguage, text, selectedOptionId, onSelect }) {
  const questionText = pickText(question.text, language, sourceLanguage)
  const headingId = `question-${question.id}`

  return (
    <fieldset aria-describedby={headingId} className="min-w-0">
      {/* The page shows this above the progress bar; here it names the group of answers */}
      <legend className="sr-only">
        {formatText(text.questionOf, { current: question.number, total })}
      </legend>

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {question.imageUrl && (
          // Fixed height; the frame widens for landscape pictures (photographs) so they are not shrunk
          <span className="flex h-40 max-w-full min-w-40 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-3">
            <img
              src={question.imageUrl}
              alt={question.imageAlt || formatText(text.signAlt, { number: question.number })}
              lang="en"
              className="h-full w-auto max-w-full object-contain"
            />
          </span>
        )}
        <p
          id={headingId}
          lang={getLanguage(questionText.language).htmlLang}
          className="text-lg leading-relaxed font-bold text-ink sm:text-xl"
        >
          {questionText.value}
        </p>
      </div>

      <ol aria-label={text.answerOptions} className="mt-6 flex flex-col gap-3">
        {question.options.map((option, index) => {
          const optionText = pickText(option.text, language, sourceLanguage)
          const selected = option.id === selectedOptionId
          return (
            <li key={option.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition focus-within:ring-2 focus-within:ring-brand/30 ${
                  selected
                    ? 'border-brand bg-brand-soft'
                    : 'border-gray-200 bg-white hover:border-brand/40 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={selected}
                  onChange={() => onSelect(option.id)}
                  className="mt-1.5 h-4 w-4 shrink-0 accent-brand"
                />
                <span className="font-semibold text-gray-500">{index + 1}.</span>
                <span
                  lang={getLanguage(optionText.language).htmlLang}
                  className={`leading-relaxed ${selected ? 'font-semibold text-ink' : 'text-gray-800'}`}
                >
                  {optionText.value}
                </span>
              </label>
            </li>
          )
        })}
      </ol>
    </fieldset>
  )
}

export default PracticeQuestion
