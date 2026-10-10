// Light Vehicle Exam - Guest Paper A: all 40 questions.
// Transcribed from the school's Tamil question paper. To add the remaining questions,
// append entries here and add their answers to answerKeys.js.
//
// - `id` values are permanent: answers and the answer key refer to questions and options
//   by id, never by position, so options can be reordered or shuffled later.
// - `text` holds one entry per language. Only the Tamil source ('ta') exists so far; add
//   `en` / `si` beside it once approved translations are available.
// - `imageAlt` describes what the sign looks like, never what it means (that is the answer).
// - The correct answers are NOT in this file: see answerKeys.js.

const SIGN_PATH = '/exam-signs/light-vehicle'

// Most questions ask the same thing about a different road sign
const SIGN_QUESTION = { ta: 'இவ் வீதிச் சமிக்ஞையினால் குறிப்பிடப்படுவது' }

// Wording used from question 26 onwards (no final ச் on வீதி). Kept exactly as printed.
const SIGN_QUESTION_LATER = { ta: 'இவ் வீதி சமிக்ஞையினால் குறிப்பிடப்படுவது' }
const ROAD_LINE_QUESTION = { ta: 'வீதியில் குறுக்காக வரையப்பட்டுள்ள இக் குறியீட்டினால் குறிப்பிடப்படுவது' }

// `options` are the four choices in the order printed on the paper. `text` is only given
// for questions with their own wording (a photograph or diagram instead of a road sign).
const signQuestion = (number, imageAlt, options, text = SIGN_QUESTION) => {
  const id = `lv-a-q${String(number).padStart(2, '0')}`
  return {
    id,
    number,
    imageUrl: `${SIGN_PATH}/light-q${String(number).padStart(2, '0')}-sign.png`,
    imageAlt,
    text,
    options: options.map((ta, index) => ({ id: `${id}-o${index + 1}`, text: { ta } })),
  }
}

export const questions = [
  signQuestion(
    1,
    'Round sign: blue circle with a red border and a red diagonal line, with two white vertical bars',
    [
      'இரட்டை நாட்களில் வாகனங்கள் உட்பிரவேசிப்பது தடைசெய்யப்பட்டுள்ளது',
      'ஒற்றை நாட்களில் வாகனங்கள் உட்பிரவேசிப்பது தடைசெய்யப்பட்டுள்ளது',
      'இரட்டை நாட்களில் வாகனங்கள் நிறுத்துவது தடைசெய்யப்பட்டுள்ளது',
      'ஒற்றை நாட்களில் வாகனங்கள் நிறுத்துவது தடைசெய்யப்பட்டுள்ளது',
    ],
  ),
  signQuestion(2, 'Yellow diamond sign with three black curved arrows forming a circle', [
    'முன்னால் நிறுத்தவும்',
    'குறுக்காகச் செல்லும் வீதிகள் முன்னால்',
    'கட்டாய சுற்றுவட்டம் முன்னால்',
    'சுற்றுவட்டம் முன்னால்',
  ]),
  signQuestion(3, 'White triangle pointing downwards with a thick red border', [
    'வீதியில் வழி விடவும்',
    'கட்டாய முக்கோண வடிவ சந்தி',
    'முன்னால் வீதியில் வழிவிடவும்',
    'பிரதான வீதி முன்னால்',
  ]),
  signQuestion(4, 'Yellow diamond sign with a black silhouette of a cow', [
    'விலங்குகள் சரணாலயம் முன்னால்',
    'மந்தைகள் வளர்க்கும் பன்னை முன்னால்',
    'மந்தைகள் மற்றும் ஏனைய விலங்குகள் முன்னால் வீதியைக் கடக்கக் கூடும்',
    'மந்தைகள் வீதியை கடப்பதற்கு ஒதுக்கப்பட்டுள்ள இடம் முன்னால்',
  ]),
  signQuestion(5, 'Yellow diamond sign with a black line that doubles back on itself in a tight loop', [
    'வலது பக்கமாக இரட்டை வளைவு முன்னால்',
    'U வடிவிற்கு திருப்ப முடியுமான இடம் முன்னால்',
    'வலது பக்கமாக வளைவு முன்னால்',
    'வலது பக்கமாக கொண்டை ஊசி வடிவ வளைவு முன்னால்',
  ]),
  signQuestion(6, 'White diamond sign with a black outline and a yellow diamond in the centre', [
    'நாற்சந்தி முன்னால்',
    'முந்துரிமைப் பாதை',
    'முந்துரிமைப் பாதை முன்னால்',
    'சந்திக் கோடு',
  ]),
  signQuestion(
    7,
    'Yellow diamond sign with a thick black vertical line and a thinner line joining it from the lower left',
    [
      'இடது பக்கத்தால் வாகனங்கள் பிரதான வீதிக்கு இணையும் சந்தி முன்னால்',
      'ஆரம்பத்தில் இடது பக்கத்திற்கு செல்லும் சிறிய சந்தி முன்னால்',
      'இடது பக்கத்தால் வரும் வாகனங்களுக்கு முந்துரிமை வழங்குக',
      'Y வடிவ சந்தி முன்னால்',
    ],
  ),
  signQuestion(8, 'Yellow diamond sign with black silhouettes of two children walking hand in hand', [
    'பிள்ளைகள் கடக்கும் இடம்',
    'கண்பார்வை அற்றோர் கடக்கும் இடம் முன்னால்',
    'பிள்ளைகள் கடக்கும் இடம் முன்னால்',
    'பாடசாலை முன்னால்',
  ]),
  signQuestion(9, 'Blue rectangular sign with a white letter P', [
    'பாதசாரிகள் கடக்கும் இடம்',
    'பொலிஸ் நிலையம்',
    'எரிபொருள் நிரப்பும் இடம்',
    'வாகனங்கள் நிறுத்தும் இடம்',
  ]),
  signQuestion(10, 'Yellow diamond sign with a black arrow that curves to the right', [
    'வலது பக்கமாக இரட்டை வளைவு முன்னால்',
    'முன்னால் வலது பக்கத்திற்கு திரும்பவும்',
    'வலது பக்க வளைவு முன்னால்',
    'வலது பக்க கொண்டை ஊசி வடிவ வளைவு முன்னால்',
  ]),
  signQuestion(11, 'Round sign: white circle with a red border, showing 5 T in black', [
    'தடைசெய்யப்பட்ட ஒரு சமிக்ஞை',
    'வரையறுக்கப்பட்ட ஒரு சமிக்ஞை',
    'ஒரு கட்டளை சமிக்ஞை',
    'ஆபத்தை குறிக்கும் ஒரு சமிக்ஞை',
  ]),
  signQuestion(12, 'Round sign: blue circle with a red border and a single red diagonal line', [
    'சகல வாகனங்களுக்கும் வீதி மூடப்பட்டுள்ளது',
    'ஒற்றை நாட்களில் வாகனம் நிறுத்துவது தடைசெய்யப்பட்டுள்ளது',
    'நிறுத்தல் மற்றும் ஏற்றல் தடை செய்யப்பட்டுள்ளது',
    'வாகனங்கள் நிறுத்துவது தடைசெய்யப்பட்டுள்ளது',
  ]),
  signQuestion(
    13,
    'Round sign: white circle with a thin black border, with the number 40 crossed by grey diagonal lines',
    [
      'அச்சாணி ஒன்றின் மீது ஏற்ற முடியுமான நிறை அளவு',
      'வேக எல்லையின் முடிவு',
      'வேக எல்லையின் ஆரம்பம்',
      'வேக எல்லை',
    ],
  ),
  signQuestion(
    14,
    'Blue square sign with a white triangle showing a person walking across a dashed line',
    [
      'பாதசாரிகளுக்கென ஒதுக்கப்பட்ட வீதியின் ஆரம்பம்',
      'பாதசாரிகளுக்கு வழி விடவும்',
      'பாதசாரிகள் கடக்கும் இடம்',
      'பாதசாரிகள் கடவை முன்னால்',
    ],
  ),
  signQuestion(15, 'Yellow diamond sign with a black car on a steep slope', [
    'வீதி இலகுவில் வழுக்கும் இடம் முன்னால்',
    'மேல் நோக்கி ஆபத்தான சரிவு முன்னால்',
    'கார் வண்டிகள் இலகுவில் வழுக்கும் இடம் முன்னால்',
    'கீழ்நோக்கி ஆபத்தான சரிவு முன்னால்',
  ]),
  signQuestion(16, 'Yellow diamond sign with a black shape like the letter Y', [
    'Y வடிவ சந்தி முன்னால்',
    'ஒடுங்கிய வீதி முன்னால்',
    'பிரதான விதிக்கு இரு பக்கங்களிலிருந்தும் வாகனங்கள் நுழையும் சந்தி முன்னால்',
    'இரட்டை வழி வீதியின் ஆரம்பம் முன்னால்',
  ]),
  signQuestion(
    17,
    'Photograph of a road junction: a car and a three-wheeler ahead in separate lanes, with white arrows painted on the road',
    [
      'மோட்டார் கார் கட்டாயமாக முன்னால் செல்லல் வேண்டும்',
      'முச்சக்கர வண்டிக்கு நேராக முன்னால் செல்ல முடியும்',
      'முச்சக்கர வண்டியை வலது பக்கத்திற்கு திருப்பவோ அல்லது நேராக செலுத்தவோ முடியும்',
      'மோட்டார் காரை நேராக முன்னால் செலுத்தவோ அல்லது வலது பக்கத்திற்கு திருப்பவோ முடியும்',
    ],
    { ta: 'படத்தில் காட்டப்பட்டுள்ள சந்தியில்' },
  ),
  signQuestion(
    18,
    'Diagram of a road leading to a junction, divided into a green zone marked A, a yellow zone marked B and a red zone marked C',
    [
      'தீர்மானித்தல், சமிக்ஞையிடல் மற்றும் செயற்படுத்தல்',
      'அவதானித்தல், தீர்மானித்தல் மற்றும் செயற்படுத்தல்',
      'சமிக்ஞையிடல், தீர்மானித்தல் மற்றும் செயற்படுத்தல்',
      'மேலுள்ள அனைத்தும் சரியானவை',
    ],
    {
      ta: 'இங்குள்ள சந்தியில் இடது பக்கத்திற்கு திருப்புவதற்கு என்னுவதாயின் முறையே A,B மற்றும் C ஆகிய இடங்களில் செய்யவேண்டியது',
    },
  ),
  signQuestion(
    19,
    'Traffic light with three lamps: only the middle amber lamp is lit',
    ['சிவப்பு மற்றும் மஞ்சள்', 'சிவப்பு', 'பச்சை மற்றும் மஞ்சள்', 'பச்சை'],
    { ta: 'காட்டப்பட்டுள்ள மோட்டார் வாகன வீதி சமிக்ஞை விளக்குகளில் அடுத்து எரியும் நிறம் யாது?' },
  ),
  signQuestion(
    20,
    'Drawing of a police officer facing forward, with one arm raised and the palm open, and the other arm stretched out to the side',
    [
      'முன்னால் மற்றும் பின்னால் வரும் சகல வாகனங்களும் நிறுத்துக',
      'பின்னால் வரும் வாகனங்கள் நிறுத்துக',
      'நிறுத்துக',
      'முன்னால் வரும் வாகனங்கள் நிறுத்துக',
    ],
    { ta: 'காட்டப்பட்டுள்ள பொலிஸ் உத்தியோகத்தரின் கட்டளை யாது?' },
  ),
  signQuestion(
    21,
    'Road marking diagram: a yellow car on a black road beside two solid white lines running along the road',
    [
      'வீதி ஒழுக்கு சமிக்ஞை',
      'மத்திய ரேகை',
      'வலது பக்கத்திற்கு திருப்புவது தவிர்ந்த குறுக்காக பயணிப்பதை தடை செய்யும் இரட்டை ரேகை',
      'வீதிக்கு குறுக்காக பயணிப்பதை தடை செய்யும் இரட்டை ரேகை',
    ],
    { ta: 'வீதியில் வரையப்பட்டுள்ள இவ்வீதி சமிக்ஞையினால் குறிப்பிடப்படுவது' },
  ),
  signQuestion(
    22,
    'Photograph of a junction with traffic lights: a car and a van ahead in separate lanes, with white arrows painted on the road',
    [
      'வேன் வண்டியை தேவையெனின் இடது பக்கம் திருப்பலாம்',
      'வேன் வண்டியை கட்டாயமாக வலது பக்கத்துக்கு திருப்ப வேண்டும்',
      'மோட்டார் காரை தேவையெனின் வலது பக்கம் திருப்பலாம்',
      'மோட்டார் காரை தேவையெனின் இடது பக்கம் திருப்பலாம்',
    ],
    { ta: 'வாகன ஒளி சமிக்ஞைகள் உள்ள இச்சந்தியில்,' },
  ),
  signQuestion(
    23,
    'Road marking diagram: a yellow car on a black road approaching a broken white line across the road, with a broken line along the side',
    [
      'வீதியில் வழி விடும் ரேகை',
      'வீதி பிரியும் இடமொன்றிலுள்ள நிறுத்தும் ரேகை',
      'நிறுத்து சமிக்ஞையில் உள்ள நிறுத்து ரேகை',
      'சுற்றுவட்டத்தில் உள்ள வீதியில் வழி விடும் ரேகை',
    ],
    ROAD_LINE_QUESTION,
  ),
  signQuestion(
    24,
    'Photograph of a car on a road approaching a junction',
    [
      'பிரதான வீதியில் வாகனங்கள் இல்லாத போது நிறுத்தவேண்டிய அவசியமில்லை',
      'கட்டாயமாக நிறுத்த வேண்டும்',
      'வலது பக்கத்திற்கு திருப்புவதாயின் மாத்திரம் நிறுத்தல் வேண்டும்.',
      'இடது பக்கத்திற்கு திருப்புகின்ற போது நிறுத்த அவசியமில்லை',
    ],
    { ta: 'படத்தில் காட்டப்பட்டுள்ள T வடிவ சந்திக்கு பிரவேசிக்கும் இச் சாரதி தனது வாகனத்தை,' },
  ),
  signQuestion(
    25,
    'Road marking diagram: a yellow car on a black road approaching two solid white lines across the road, with a broken line along the side',
    [
      'வீதியில் வழி விடும் ரேகை',
      'மோட்டார் வாகன வீதி சமிக்ஞை விளக்கு ஒளியின் போது அல்லது பொலிஸாரினால் நிருவகிக்கப்படும் இடங்களுக்கு இடையில் உள்ள நிறுத்தும் ரேகை',
      'நிறுத்து சமிக்ஞையில் உள்ள நிறுத்து ரேகை',
      'சுற்றுவட்டத்தில் உள்ள வீதியில் வழி விடும் ரேகை',
    ],
    ROAD_LINE_QUESTION,
  ),
  signQuestion(
    26,
    'Sign shaped like a diagonal cross, white with a red outline',
    [
      'முன்னால் வீதி மூடப்பட்டுள்ளது',
      'புகையிரத குறுக்கு வீதி முன்னால்',
      'பாதுகாப்பற்ற புகையிரத குறுக்கு வீதி',
      'பாதுகாப்பற்ற புகையிரத குறுக்கு வீதி முன்னால்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    27,
    'Round sign: plain white circle with a thick red border',
    [
      'கட்டாய சுற்று வட்டம்',
      'உட்பிரவேசித்தல் தடைசெய்யப்பட்டுள்ளது',
      'வசு மற்றும் லொறிகளுக்கு வீதி மூடப்பட்டுள்ளது',
      'வீதி முடப்பட்டுள்ளது',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    28,
    'Yellow diamond sign with a black car above two wavy lines',
    [
      'இலகுவில் வழுக்கும் வீதி முன்னால்',
      'வளைவுகளுடன் கூடிய வீதி முன்னால்',
      'அபாயகரமான சந்தி முன்னால்',
      'முன்னால் வீதி ஒடுக்கம்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    29,
    'Yellow diamond sign with two black lines at the bottom that join into a single line at the top',
    [
      'Y வடிவ சந்தி முன்னால்',
      'முன்னால் வீதி ஒடுக்கம்',
      'இரு வழி வாகனப் பாதையின் முடிவு முன்னால்',
      'ஒடுங்கிய பாலம் முன்னால்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    30,
    'Round sign: white circle with a thick red border and three black curved arrows forming a circle',
    ['கட்டாய சுற்று வட்டம் முன்னால்', 'கட்டாய சுற்று வட்டம்', 'சுற்று வட்டம் முன்னால்', 'சுற்று வட்டம்'],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    31,
    'Round sign: white circle with a thick red border and a black arrow that turns to the left',
    [
      'இடது பக்கத்திற்கு திருப்பி நிறுத்தவும்',
      'இடது பக்கத்திற்கு திருப்ப வேண்டும்',
      'இடது பக்கத்துக்கு திருப்புவதற்கு முந்துரிமை',
      'முன்னால் இடது பக்கத்திற்கு திருப்ப வேண்டும்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    32,
    'Round sign: white circle with a red border and a red diagonal line across a black horn',
    [
      'ஒரு தகவல் சமிக்ஞை',
      'ஒரு எச்சரிக்கை சமிக்ஞை',
      'ஒரு தடைசெய்யப்பட்ட சமிக்ஞை',
      'ஒரு கட்டளை சமிக்ஞை',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    33,
    'Yellow diamond sign with a black line that doubles back on itself in a tight loop, opening to the left',
    [
      'இடது பக்கத்திற்கு இரட்டை வளைவு முன்னால்',
      'இடது பக்கத்திற்கு கொண்டை ஊசி வடிவ வளைவு முன்னால்',
      'இடது பக்கத்திற்கு வளைவு முன்னால்',
      'U வடிவில் திருப்ப முடியுமான இடம் முன்னால்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    34,
    'Round sign: white circle with a red border and a red diagonal line across a car and a motorcycle',
    [
      'சகல வாகனங்களுக்கும் வீதி மூடப்பட்டுள்ளது',
      'வீதி மூடப்பட்டுள்ளது',
      'கார் மற்றும் துவிச்சக்கர வண்டிகளுக்கு வீதி மூடப்பட்டுள்ளது',
      'கார் மற்றும் துவிச்சக்கர வண்டிகள் உட்பிரவேசித்தல் தடை செய்யப்பட்டுள்ளது',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    35,
    'Yellow diamond sign with a black octagon in the centre',
    [
      'சுற்றுவட்டம் முன்னால்',
      'வாகனங்கள் நிறுத்தும் இடம்',
      'நிறுத்து',
      'முன்னால் நிறுத்து',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    36,
    'Yellow diamond sign with two black vertical lines that bend closer together at the top',
    [
      'இரு வழி வாகனப் பாதை ஆரம்பம் முன்னால்',
      'முன்னால் வீதி ஒடுக்கம்',
      'இரு வழி வாகனப் பாதை முடிவு முன்னால்',
      'ஒடுங்கிய பாலம் முன்னால்',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    37,
    'Round sign: white circle with a thick red border, showing 40 Km p. h. in black',
    [
      'வேகத்தின் எல்லை',
      'சாதாரண வேகம்',
      'ஆகக்குறைந்த வேகம்',
      'நகர எல்லையினுள் வேகத்தின் அளவு',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    38,
    'Round sign: blue circle with a red border and a red diagonal cross',
    [
      'முன்னால் சந்தியொன்று',
      'ஒற்றை நாட்களில் நிறுத்தல் மற்றும் ஏற்றல் தடைசெய்யப்பட்டுள்ளது',
      'இரட்டை நாட்களில் நிறுத்தல் மற்றும் ஏற்றல் தடைசெய்யப்பட்டுள்ளது',
      'நிறுத்தல் மற்றும் ஏற்றல் தடைசெய்யப்பட்டுள்ளது',
    ],
    SIGN_QUESTION_LATER,
  ),
  signQuestion(
    39,
    'Traffic light with three lamps: only the top red lamp is lit',
    [
      'பச்சை',
      'மஞ்சள்',
      'சிவப்பு மற்றும் மஞ்சள்',
      'மஞ்சள் மற்றும் பச்சை',
    ],
    { ta: 'காட்டப்பட்டுள்ள மோட்டார் வாகன வீதி சமிக்ஞை விளக்குகளில் அடுத்து எரியும் நிறம் யாது?' },
  ),
  signQuestion(
    40,
    'Round sign: white circle with a red border and a red diagonal line across two black arrows pointing in opposite directions',
    [
      'முன்னால் வரும் வாகனங்களக்கு முந்துரிமை முடிவு',
      'உட்பிரவேசிப்பது தடைசெய்யப்பட்டுள்ளது',
      'வாகனங்களை முந்துதல் தடைசெய்யப்பட்டுள்ளது',
      'இரட்டை நாட்களில் நிறுத்துவது தடைசெய்யப்பட்டுள்ளது',
    ],
    SIGN_QUESTION_LATER,
  ),
]
