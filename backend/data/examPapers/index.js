// Practice papers of each exam category (see config/exams.js for the categories).
// To add a paper: add its question file and an entry here, plus its answers in
// answerKeys.js. An exam category without an entry simply has no papers yet.

import { questions as lightVehiclePaperA } from './lightVehiclePaperA.js'

// Language the questions were written in, shown when a translation is missing
export const SOURCE_LANGUAGE = 'ta'

// `id` is used in URLs. Tamil and Sinhala titles match the public Exam Papers page.
export const papersByExam = {
  'light-vehicle': [
    {
      id: 'paper-a',
      title: { en: 'Guest Paper A', ta: 'மாதிரி வினாத்தாள் A', si: 'අනුමාන ප්‍රශ්න පත්‍රය A' },
      questions: lightVehiclePaperA,
    },
    {
      id: 'paper-b',
      title: { en: 'Guest Paper B', ta: 'மாதிரி வினாத்தாள் B', si: 'අනුමාන ප්‍රශ්න පත්‍රය B' },
      questions: [],
    },
  ],
}
