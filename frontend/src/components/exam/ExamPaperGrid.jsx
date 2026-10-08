import ExamPaperCard from './ExamPaperCard'
import { getPaperTitle } from '../../data/examPapersData'

function ExamPaperGrid({ papers, language, text }) {
  return (
    <ul className="mx-auto grid max-w-5xl auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {papers.map((paper) => (
        <li key={paper.id}>
          <ExamPaperCard
            id={paper.id}
            title={getPaperTitle(paper, language)}
            label={text.cardLabel}
            actionText={text.viewPaper}
            language={language}
          />
        </li>
      ))}
    </ul>
  )
}

export default ExamPaperGrid
