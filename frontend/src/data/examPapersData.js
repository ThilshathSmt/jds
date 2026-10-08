// Static content for the Exam Papers section.
// Everything here is frontend placeholder data that will later come from the backend / admin panel.

export const DEFAULT_LANGUAGE = 'en'

// `htmlLang` is set on translated content so browsers/screen readers pick the right font and voice
export const languages = [
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'ta', label: 'தமிழ்', htmlLang: 'ta' },
  { code: 'si', label: 'සිංහල', htmlLang: 'si' },
]

// TODO: Have the Tamil and Sinhala text reviewed by a native speaker before going live
export const translations = {
  en: {
    eyebrow: 'Exam Papers',
    title: 'Written Examination for the Motor Traffic Law',
    subtitle: 'Prepare for your driving written examination with our practice papers.',
    description:
      'Practice with sample examination papers to improve your knowledge of road rules, traffic signs and driving regulations.',
    languageLabel: 'Choose your language',
    sectionTitle: 'Practice Papers',
    sectionSubtitle: 'Select a paper to begin practising.',
    cardLabel: 'Exam Paper',
    viewPaper: 'View Paper',
    placeholder: 'Questions will be added here later.',
    backToPapers: 'Back to Exam Papers',
    notFoundTitle: 'Paper not found',
    notFoundText: 'The exam paper you are looking for does not exist.',
  },
  ta: {
    eyebrow: 'வினாத்தாள்கள்',
    title: 'மோட்டார் போக்குவரத்துச் சட்டத்திற்கான எழுத்துப் பரீட்சை',
    subtitle: 'எமது பயிற்சி வினாத்தாள்கள் மூலம் உங்கள் சாரதி எழுத்துப் பரீட்சைக்குத் தயாராகுங்கள்.',
    description:
      'வீதி விதிகள், போக்குவரத்துச் சமிக்ஞைகள் மற்றும் வாகனம் ஓட்டும் ஒழுங்குமுறைகள் பற்றிய உங்கள் அறிவை மேம்படுத்த மாதிரி வினாத்தாள்களுடன் பயிற்சி செய்யுங்கள்.',
    languageLabel: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    sectionTitle: 'பயிற்சி வினாத்தாள்கள்',
    sectionSubtitle: 'பயிற்சியைத் தொடங்க ஒரு வினாத்தாளைத் தேர்ந்தெடுக்கவும்.',
    cardLabel: 'வினாத்தாள்',
    viewPaper: 'வினாத்தாளைப் பார்க்க',
    placeholder: 'வினாக்கள் பின்னர் இங்கே சேர்க்கப்படும்.',
    backToPapers: 'வினாத்தாள்களுக்குத் திரும்புக',
    notFoundTitle: 'வினாத்தாள் கிடைக்கவில்லை',
    notFoundText: 'நீங்கள் தேடும் வினாத்தாள் இல்லை.',
  },
  si: {
    eyebrow: 'විභාග ප්‍රශ්න පත්‍ර',
    title: 'මෝටර් වාහන ගමනාගමන නීතිය සඳහා ලිඛිත විභාගය',
    subtitle: 'අපගේ පුහුණු ප්‍රශ්න පත්‍ර සමඟ ඔබගේ රියදුරු ලිඛිත විභාගයට සූදානම් වන්න.',
    description:
      'මාර්ග නීති, මාර්ග සංඥා සහ රිය පැදවීමේ රෙගුලාසි පිළිබඳ ඔබගේ දැනුම වැඩි දියුණු කර ගැනීමට ආදර්ශ විභාග ප්‍රශ්න පත්‍ර සමඟ පුහුණු වන්න.',
    languageLabel: 'ඔබගේ භාෂාව තෝරන්න',
    sectionTitle: 'පුහුණු ප්‍රශ්න පත්‍ර',
    sectionSubtitle: 'පුහුණුව ආරම්භ කිරීමට ප්‍රශ්න පත්‍රයක් තෝරන්න.',
    cardLabel: 'විභාග ප්‍රශ්න පත්‍රය',
    viewPaper: 'ප්‍රශ්න පත්‍රය බලන්න',
    placeholder: 'ප්‍රශ්න පසුව මෙහි එක් කෙරේ.',
    backToPapers: 'විභාග ප්‍රශ්න පත්‍ර වෙත ආපසු',
    notFoundTitle: 'ප්‍රශ්න පත්‍රය හමු නොවීය',
    notFoundText: 'ඔබ සොයන විභාග ප්‍රශ්න පත්‍රය නොපවතී.',
  },
}

// Add a new entry here to add a paper; `title` holds its name in every supported language.
// Later each paper can also carry its questions per language, e.g. `questions: { en: [...], ta: [...], si: [...] }`.
export const examPapers = [
  {
    id: 'A',
    title: { en: 'Guess Paper A', ta: 'மாதிரி வினாத்தாள் A', si: 'අනුමාන ප්‍රශ්න පත්‍රය A' },
  },
  {
    id: 'B',
    title: { en: 'Guess Paper B', ta: 'மாதிரி வினாத்தாள் B', si: 'අනුමාන ප්‍රශ්න පත්‍රය B' },
  },
  {
    id: 'C',
    title: { en: 'Guess Paper C', ta: 'மாதிரி வினாத்தாள் C', si: 'අනුමාන ප්‍රශ්න පත්‍රය C' },
  },
]

export const getTranslation = (language) => translations[language] ?? translations[DEFAULT_LANGUAGE]

export const getLanguage = (code) =>
  languages.find((language) => language.code === code) ?? languages[0]

export const findExamPaper = (paperId) =>
  examPapers.find((paper) => paper.id.toLowerCase() === paperId?.toLowerCase())

export const getPaperTitle = (paper, language) => paper.title[language] ?? paper.title[DEFAULT_LANGUAGE]
