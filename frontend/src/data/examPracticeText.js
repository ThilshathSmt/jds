// Labels of the Student panel practice papers, in the languages of the public Exam Papers
// page (see examPapersData.js, whose language list and shared labels are reused).
// Only interface labels live here. The questions and answer options come from the backend
// and are shown in their source language until an approved translation exists.
// `{name}` placeholders are filled in with formatText().
// TODO: Have the Tamil and Sinhala text reviewed by a native speaker before going live

import { DEFAULT_LANGUAGE } from './examPapersData'

const practiceText = {
  en: {
    backToPapers: 'Back to Practice Papers',
    questionCount: '{count} questions',
    noQuestions: 'Questions will be added soon.',
    translationPending:
      'This paper has not been translated into {language} yet. The questions and answers are shown in the original Tamil.',
    instruction: 'Choose the correct answer. You can change your answer before you finish.',
    questionOf: 'Question {current} of {total}',
    answeredCount: '{count} of {total} answered',
    progress: 'Progress',
    questionList: 'Questions',
    goToQuestion: 'Go to question {number}',
    answered: 'answered',
    notAnswered: 'not answered',
    signAlt: 'Road sign for question {number}',
    answerOptions: 'Answer options',
    previous: 'Previous',
    next: 'Next',
    finish: 'Finish',
    completedTitle: 'Practice complete',
    completedMessage: 'You answered {count} of {total} questions.',
    unanswered: 'Not answered: {numbers}',
    resultsSoon: 'Scoring and results will be available soon.',
    review: 'Review my answers',
    restart: 'Start again',
    loading: 'Loading paper...',
    loadError: 'The paper could not be loaded.',
    notFoundTitle: 'Paper not found',
    notFoundText: 'This practice paper does not exist. Please choose one from the Exams page.',
  },
  ta: {
    backToPapers: 'பயிற்சி வினாத்தாள்களுக்குத் திரும்புக',
    questionCount: '{count} வினாக்கள்',
    noQuestions: 'வினாக்கள் விரைவில் சேர்க்கப்படும்.',
    translationPending:
      'இந்த வினாத்தாள் இன்னும் {language} மொழியில் மொழிபெயர்க்கப்படவில்லை. வினாக்களும் விடைகளும் மூல தமிழ் மொழியில் காட்டப்படுகின்றன.',
    instruction: 'சரியான விடையைத் தேர்ந்தெடுக்கவும். முடிப்பதற்கு முன் உங்கள் விடையை மாற்றலாம்.',
    questionOf: 'வினா {current} / {total}',
    answeredCount: '{total} இல் {count} வினாக்களுக்கு விடையளிக்கப்பட்டுள்ளது',
    progress: 'முன்னேற்றம்',
    questionList: 'வினாக்கள்',
    goToQuestion: 'வினா {number} இற்குச் செல்க',
    answered: 'விடையளிக்கப்பட்டது',
    notAnswered: 'விடையளிக்கப்படவில்லை',
    signAlt: 'வினா {number} இற்கான வீதிச் சமிக்ஞை',
    answerOptions: 'விடைத் தெரிவுகள்',
    previous: 'முந்தையது',
    next: 'அடுத்தது',
    finish: 'முடிக்க',
    completedTitle: 'பயிற்சி நிறைவடைந்தது',
    completedMessage: '{total} வினாக்களில் {count} வினாக்களுக்கு விடையளித்துள்ளீர்கள்.',
    unanswered: 'விடையளிக்கப்படாதவை: {numbers}',
    resultsSoon: 'புள்ளிகளும் பெறுபேறுகளும் விரைவில் கிடைக்கும்.',
    review: 'எனது விடைகளை மீளப் பார்க்க',
    restart: 'மீண்டும் தொடங்க',
    loading: 'வினாத்தாள் ஏற்றப்படுகிறது...',
    loadError: 'வினாத்தாளை ஏற்ற முடியவில்லை.',
    notFoundTitle: 'வினாத்தாள் கிடைக்கவில்லை',
    notFoundText: 'இந்தப் பயிற்சி வினாத்தாள் இல்லை. பரீட்சைகள் பக்கத்திலிருந்து ஒன்றைத் தேர்ந்தெடுக்கவும்.',
  },
  si: {
    backToPapers: 'පුහුණු ප්‍රශ්න පත්‍ර වෙත ආපසු',
    questionCount: 'ප්‍රශ්න {count}',
    noQuestions: 'ප්‍රශ්න ඉක්මනින් එක් කෙරේ.',
    translationPending:
      'මෙම ප්‍රශ්න පත්‍රය තවමත් {language} භාෂාවට පරිවර්තනය කර නොමැත. ප්‍රශ්න සහ පිළිතුරු මුල් දෙමළ භාෂාවෙන් පෙන්වයි.',
    instruction: 'නිවැරදි පිළිතුර තෝරන්න. අවසන් කිරීමට පෙර ඔබගේ පිළිතුර වෙනස් කළ හැක.',
    questionOf: 'ප්‍රශ්නය {current} / {total}',
    answeredCount: 'ප්‍රශ්න {total}න් {count}කට පිළිතුරු දී ඇත',
    progress: 'ප්‍රගතිය',
    questionList: 'ප්‍රශ්න',
    goToQuestion: 'ප්‍රශ්න අංක {number} වෙත යන්න',
    answered: 'පිළිතුරු දී ඇත',
    notAnswered: 'පිළිතුරු දී නැත',
    signAlt: 'ප්‍රශ්න අංක {number} සඳහා මාර්ග සංඥාව',
    answerOptions: 'පිළිතුරු තේරීම්',
    previous: 'පෙර',
    next: 'ඊළඟ',
    finish: 'අවසන් කරන්න',
    completedTitle: 'පුහුණුව අවසන්',
    completedMessage: 'ඔබ ප්‍රශ්න {total}න් {count}කට පිළිතුරු දී ඇත.',
    unanswered: 'පිළිතුරු නොදුන්: {numbers}',
    resultsSoon: 'ලකුණු සහ ප්‍රතිඵල ඉක්මනින් ලබා ගත හැකි වේ.',
    review: 'මගේ පිළිතුරු නැවත බලන්න',
    restart: 'නැවත ආරම්භ කරන්න',
    loading: 'ප්‍රශ්න පත්‍රය පූරණය වෙමින්...',
    loadError: 'ප්‍රශ්න පත්‍රය පූරණය කළ නොහැකි විය.',
    notFoundTitle: 'ප්‍රශ්න පත්‍රය හමු නොවීය',
    notFoundText: 'මෙම පුහුණු ප්‍රශ්න පත්‍රය නොපවතී. විභාග පිටුවෙන් එකක් තෝරන්න.',
  },
}

export const getPracticeText = (language) => practiceText[language] ?? practiceText[DEFAULT_LANGUAGE]

// formatText('Question {current} of {total}', { current: 1, total: 10 })
export const formatText = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)

// Picks the text for `language` from { en, ta, si }, falling back to `fallbackLanguage`
// (the language the content was written in). Returns the language actually used, so the
// element can carry the right `lang` attribute.
export const pickText = (text, language, fallbackLanguage) => {
  const used = text[language] ? language : fallbackLanguage
  return { value: text[used] ?? '', language: used }
}
