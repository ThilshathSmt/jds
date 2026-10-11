// Heavy Vehicle Exam - Practice Paper A: 45 questions.
//
//   1-40:  the questions of Light Vehicle Guest Paper A, shared rather than copied: the
//          same objects, ids, pictures and (in answerKeys.js) the same answers. A correction
//          made to one of them there applies here too.
//   41-45: heavy-vehicle questions, transcribed from the school's Tamil question paper
//          (numbered 166-170 there). They have no picture.
//
// As in the light-vehicle file: ids are permanent, `text` holds one entry per language
// (the Tamil source here, translations from ./translations), and the correct answers are
// in answerKeys.js, not here.

import { questions as lightVehiclePaperA } from './lightVehiclePaperA.js'

// `options` are the four choices in the order printed on the paper
const textQuestion = (number, ta, options) => {
  const id = `hv-a-q${String(number).padStart(2, '0')}`
  return {
    id,
    number,
    text: { ta },
    options: options.map((option, index) => ({ id: `${id}-o${index + 1}`, text: { ta: option } })),
  }
}

const heavyVehicleQuestions = [
  textQuestion(
    41,
    'தாங்கள் செலுத்தும் வாகனத்தின் எஞ்ஜினின் வெப்பம் அதிகரித்து நீர் கொதிக்கும் நிலையில் குறைநீரை ஊற்றும் போது கடைப்பிடிக்க வேண்டியது',
    [
      'வாகனத்தின் எஞ்ஜின் தொடர்பாக கவனம் செலுத்த தேவையில்லை',
      'எஞ்சினை நிறுத்தி நீர் ஊற்ற வேண்டும்',
      'எஞ்ஜின் இயக்கத்தில் உள்ள போது நீர் ஊற்ற வேண்டும்',
      'மேலுள்ள கூற்றுக்கள் இரண்டும் சரியானவை',
    ],
  ),
  textQuestion(
    42,
    'தாங்கள் செலுத்தும் வாகனத்தில் மின் கோளாறு எற்பட்டு வயர்கள் எரியும் நாற்றம் நுகரப்படுமாயின் உடனடியாக தாங்கள் செய்ய வேண்டியது',
    [
      'வாகனத்தின் சகல விளக்குகளையும் அனைத்துவிடல்',
      'பிரதான சுவிச்சை செயலிழக்கச் செய்தல்',
      'பியுஸை கழற்றுதல்',
      'பற்றறி வயரை கழற்றுதல்',
    ],
  ),
  textQuestion(43, 'வாகனமொன்று சறுகிச் செல்லும் போது ஏற்படும் ஆபத்தை குறைக்க செய்ய வேண்டியது', [
    'சறுகிச் செல்லும் போது ஆபத்தை குறைக்க முடியாது',
    'உடனே பிரேக் இட்டு வேகத்தைக் கட்டுப்படுத்தல்',
    'பிரேக் இடாமல் சறுகிச் செல்லும் திசையின் மாற்றுத்திசைக்கு சுக்கானை திருப்புதல் வேண்டும்',
    'கியர் மூலம் கட்டுப்படுத்தி சறுகிச் செல்லும் திசைக்கு முறைப்படி சுக்கானை கட்டுப்படுத்தல் வேண்டும்',
  ]),
  textQuestion(
    44,
    'பிரேக் எண்ணெய் பயன்படுத்தப்படும் ஒரு வாகனத்தில் பிரேக் பெடல் கீழுக்கே செல்லுமாயின் அதன் மூலம் புலப்படுவது',
    [
      'பிரேக் பெடலில் கோளாறு உள்ளது என்பதாகும்',
      'பிரேக் பயின்ட் (பிரேக் இறுக்கம்) உள்ளது என்பதாகும்',
      'பிரேக் ஒழுங்காக செயற்படுகிறது என்பதாகும்',
      'பிரேக் எண்ணெய் கசிவு உள்ளது என்பதாகும்',
    ],
  ),
  textQuestion(
    45,
    'வாகனத்திற்கு பிரேக் இடும் போது இடது பக்கத்திற்கு இழுத்துச் செல்லுமாயின் அதன் மூலம் புலப்படுவது',
    [
      'டயர்களின் வளி அழுக்கம் ஒவ்வொன்றுக்கு மாற்றமாக உள்ளது என்பதாகும்',
      'முன்னால் இடது பக்க டயரில் பிரேக் எண்ணெய் கசிவு உள்ளது என்பதாகும்',
      'முன்னால் வலது பக்க டயரில் பிரேக் எண்ணெய் கசிவு உள்ளது என்பதாகும்',
      'பின்னாலுள்ள டயர்களில் பிரேக் எண்ணெய் இல்லை என்பதாகும்',
    ],
  ),
]

export const questions = [...lightVehiclePaperA, ...heavyVehicleQuestions]
