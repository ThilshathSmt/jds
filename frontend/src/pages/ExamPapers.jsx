import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import ExamHero from '../components/exam/ExamHero'
import LanguageSelector from '../components/exam/LanguageSelector'
import ExamPaperGrid from '../components/exam/ExamPaperGrid'
import {
  DEFAULT_LANGUAGE,
  examPapers,
  getLanguage,
  getTranslation,
  languages,
} from '../data/examPapersData'

function ExamPapers() {
  const location = useLocation()
  // English by default; keeps the language chosen before opening a paper when coming back
  const [language, setLanguage] = useState(location.state?.language ?? DEFAULT_LANGUAGE)
  const text = getTranslation(language)

  return (
    <div lang={getLanguage(language).htmlLang}>
      <ExamHero text={text} />

      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="container-page">
          <LanguageSelector
            languages={languages}
            selected={language}
            onChange={setLanguage}
            label={text.languageLabel}
          />

          <div className="mx-auto mt-12 mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">{text.sectionTitle}</h2>
            <span className="mx-auto mt-4 block h-1 w-16 rounded-full bg-brand" aria-hidden="true" />
            <p className="mt-4 text-base text-gray-600">{text.sectionSubtitle}</p>
          </div>

          <ExamPaperGrid papers={examPapers} language={language} text={text} />
        </div>
      </section>
    </div>
  )
}

export default ExamPapers
