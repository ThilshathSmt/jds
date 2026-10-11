// Practice papers of each exam category (see config/exams.js for the categories).
// To add a paper: add its question file and an entry here, plus its answers in
// answerKeys.js. An exam category without an entry simply has no papers yet.

import { questions as heavyVehiclePaperA } from './heavyVehiclePaperA.js'
import { questions as lightVehiclePaperA } from './lightVehiclePaperA.js'
import { withTranslations } from './translations/index.js'

// Language the questions were written in, shown when a translation is missing.
// Translations are kept in ./translations and added to the questions below.
export const SOURCE_LANGUAGE = 'ta'

// `id` is used in URLs. Tamil and Sinhala titles match the public Exam Papers page.
// `durationMinutes` is the time allowed for one timed attempt at the paper.
export const papersByExam = {
  'light-vehicle': [
    {
      id: 'paper-a',
      title: { en: 'Guest Paper A', ta: 'மாதிரி வினாத்தாள் A', si: 'අනුමාන ප්‍රශ්න පත්‍රය A' },
      durationMinutes: 60,
      questions: withTranslations(lightVehiclePaperA),
    },
    {
      id: 'paper-b',
      title: { en: 'Guest Paper B', ta: 'மாதிரி வினாத்தாள் B', si: 'අනුමාන ප්‍රශ්න පත්‍රය B' },
      durationMinutes: 60,
      questions: [],
    },
  ],
  'heavy-vehicle': [
    {
      id: 'paper-a',
      title: { en: 'Practice Paper A', ta: 'மாதிரி வினாத்தாள் A', si: 'අනුමාන ප්‍රශ්න පත්‍රය A' },
      durationMinutes: 60,
      questions: withTranslations(heavyVehiclePaperA),
    },
    {
      id: 'paper-b',
      title: { en: 'Practice Paper B', ta: 'மாதிரி வினாத்தாள் B', si: 'අනුමාන ප්‍රශ්න පත්‍රය B' },
      durationMinutes: 60,
      questions: [],
    },
  ],
}
