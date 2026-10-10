import { useState } from 'react'
import { DEFAULT_LANGUAGE, languages } from '../data/examPapersData'

const STORAGE_KEY = 'jds-exam-language'

const isSupported = (code) => languages.some((language) => language.code === code)

// Storage can be unavailable (private windows, blocked site data): the choice is then
// simply not remembered
const readStored = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupported(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

// [language, setLanguage] for the student exam pages. The choice is remembered in this
// browser, so it survives moving between pages and refreshing.
function useExamLanguage() {
  const [language, setLanguageState] = useState(readStored)

  const setLanguage = (code) => {
    if (!isSupported(code)) return
    setLanguageState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // Not remembered; the selection still applies to this page
    }
  }

  return [language, setLanguage]
}

export default useExamLanguage
