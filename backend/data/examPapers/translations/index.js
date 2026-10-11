// Translations of the practice paper questions, one file per language. The Tamil source
// stays in the question files and is never changed here.
// To add a language: add its file (same shape as en.js) and an entry below.

import { en } from './en.js'

const translationsByLanguage = { en }

// Returns the questions with each available translation added beside the Tamil source:
// `text` becomes { ta, en } for the question and for each of its options. A question
// without a translation in a language is simply left without that language.
export const withTranslations = (questions) =>
  questions.map((question) => {
    const text = { ...question.text }
    const optionTexts = question.options.map((option) => ({ ...option.text }))

    for (const [language, translations] of Object.entries(translationsByLanguage)) {
      const translation = Object.hasOwn(translations, question.id) ? translations[question.id] : null
      if (!translation) continue
      // Options are matched by position in the source file, so a wrong count would put
      // a translation on the wrong option
      if (translation.options.length !== question.options.length) {
        throw new Error(
          `Exam paper data error: the ${language} translation of ${question.id} must have ${question.options.length} options`,
        )
      }
      text[language] = translation.text
      translation.options.forEach((optionText, index) => {
        optionTexts[index][language] = optionText
      })
    }

    return {
      ...question,
      text,
      options: question.options.map((option, index) => ({ ...option, text: optionTexts[index] })),
    }
  })
