import { formatText } from '../../data/examPracticeText'

// The road sign, photograph or diagram of a question, in a frame of fixed height. The
// frame widens for landscape pictures (photographs) so they are not shrunk.
function QuestionFigure({ question, text }) {
  if (!question.imageUrl) return null
  return (
    <span className="flex h-40 max-w-full min-w-40 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white p-3">
      <img
        src={question.imageUrl}
        alt={question.imageAlt || formatText(text.signAlt, { number: question.number })}
        lang="en"
        className="h-full w-auto max-w-full object-contain"
      />
    </span>
  )
}

export default QuestionFigure
