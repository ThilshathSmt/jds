// English translations of the practice paper questions, translated from the Tamil source
// in lightVehiclePaperA.js and heavyVehiclePaperA.js.
//
//   { questionId: { text, options } }
//
// `options` are the four choices in the order of the question's options in its source
// file (-o1 to -o4), so every English option belongs to the Tamil option with the same id.
// The answer key refers to those ids, so it applies to every language unchanged.
// Questions lv-a-q01 to lv-a-q40 are shared by the Light Vehicle and Heavy Vehicle papers.
// TODO: Have these translations reviewed against the school's printed paper before going live

const SIGN_QUESTION = 'What is indicated by this road sign?'
const ROAD_LINE_QUESTION = 'What is indicated by this marking drawn across the road?'
const NEXT_LIGHT_QUESTION = 'Which colour will light up next on the traffic signal lights shown?'

export const en = {
  'lv-a-q01': {
    text: SIGN_QUESTION,
    options: [
      'Entry of vehicles is prohibited on even days',
      'Entry of vehicles is prohibited on odd days',
      'Parking of vehicles is prohibited on even days',
      'Parking of vehicles is prohibited on odd days',
    ],
  },
  'lv-a-q02': {
    text: SIGN_QUESTION,
    options: ['Stop ahead', 'Cross roads ahead', 'Compulsory roundabout ahead', 'Roundabout ahead'],
  },
  'lv-a-q03': {
    text: SIGN_QUESTION,
    options: ['Give way', 'Compulsory triangular junction', 'Give way ahead', 'Main road ahead'],
  },
  'lv-a-q04': {
    text: SIGN_QUESTION,
    options: [
      'Animal sanctuary ahead',
      'Cattle farm ahead',
      'Cattle and other animals may cross the road ahead',
      'Place reserved for cattle to cross the road ahead',
    ],
  },
  'lv-a-q05': {
    text: SIGN_QUESTION,
    options: [
      'Double bend to the right ahead',
      'Place where a U-turn can be made ahead',
      'Bend to the right ahead',
      'Hairpin bend to the right ahead',
    ],
  },
  'lv-a-q06': {
    text: SIGN_QUESTION,
    options: ['Four-way junction ahead', 'Priority road', 'Priority road ahead', 'Junction line'],
  },
  'lv-a-q07': {
    text: SIGN_QUESTION,
    options: [
      'Junction ahead where vehicles join the main road from the left',
      'Minor junction ahead that first leads to the left',
      'Give priority to vehicles coming from the left',
      'Y-junction ahead',
    ],
  },
  'lv-a-q08': {
    text: SIGN_QUESTION,
    options: [
      "Children's crossing",
      'Crossing for blind persons ahead',
      "Children's crossing ahead",
      'School ahead',
    ],
  },
  'lv-a-q09': {
    text: SIGN_QUESTION,
    options: ['Pedestrian crossing', 'Police station', 'Filling station', 'Parking place'],
  },
  'lv-a-q10': {
    text: SIGN_QUESTION,
    options: [
      'Double bend to the right ahead',
      'Turn right ahead',
      'Right bend ahead',
      'Right hairpin bend ahead',
    ],
  },
  'lv-a-q11': {
    text: SIGN_QUESTION,
    options: ['A prohibitory sign', 'A restrictive sign', 'A mandatory sign', 'A danger warning sign'],
  },
  'lv-a-q12': {
    text: SIGN_QUESTION,
    options: [
      'Road closed to all vehicles',
      'Parking of vehicles is prohibited on odd days',
      'Parking and standing are prohibited',
      'Parking of vehicles is prohibited',
    ],
  },
  'lv-a-q13': {
    text: SIGN_QUESTION,
    options: [
      'Maximum weight that may be loaded on one axle',
      'End of speed limit',
      'Start of speed limit',
      'Speed limit',
    ],
  },
  'lv-a-q14': {
    text: SIGN_QUESTION,
    options: [
      'Start of a road reserved for pedestrians',
      'Give way to pedestrians',
      'Pedestrian crossing',
      'Pedestrian crossing ahead',
    ],
  },
  'lv-a-q15': {
    text: SIGN_QUESTION,
    options: [
      'Place where the road is slippery ahead',
      'Dangerous ascent ahead',
      'Place where cars skid easily ahead',
      'Dangerous descent ahead',
    ],
  },
  'lv-a-q16': {
    text: SIGN_QUESTION,
    options: [
      'Y-junction ahead',
      'Narrow road ahead',
      'Junction ahead where vehicles enter the main road from both sides',
      'Start of dual carriageway ahead',
    ],
  },
  'lv-a-q17': {
    text: 'At the junction shown in the picture,',
    options: [
      'The motor car must go straight ahead',
      'The three-wheeler can go straight ahead',
      'The three-wheeler can either turn right or go straight',
      'The motor car can either go straight ahead or turn right',
    ],
  },
  'lv-a-q18': {
    text: 'If you intend to turn left at this junction, what should be done at the places A, B and C respectively?',
    options: [
      'Decide, signal and act',
      'Observe, decide and act',
      'Signal, decide and act',
      'All of the above are correct',
    ],
  },
  'lv-a-q19': {
    text: NEXT_LIGHT_QUESTION,
    options: ['Red and amber', 'Red', 'Green and amber', 'Green'],
  },
  'lv-a-q20': {
    text: 'What is the command given by the police officer shown?',
    options: [
      'All vehicles coming from the front and from behind must stop',
      'Vehicles coming from behind must stop',
      'Stop',
      'Vehicles coming from the front must stop',
    ],
  },
  'lv-a-q21': {
    text: 'What is indicated by this road marking drawn on the road?',
    options: [
      'Lane marking',
      'Centre line',
      'Double line that prohibits crossing, except for turning right',
      'Double line that prohibits crossing the road',
    ],
  },
  'lv-a-q22': {
    text: 'At this junction with traffic lights,',
    options: [
      'The van may turn left if required',
      'The van must turn right',
      'The motor car may turn right if required',
      'The motor car may turn left if required',
    ],
  },
  'lv-a-q23': {
    text: ROAD_LINE_QUESTION,
    options: [
      'Give way line',
      'Stop line at a place where the road divides',
      'Stop line at a stop sign',
      'Give way line at a roundabout',
    ],
  },
  'lv-a-q24': {
    text: 'When entering the T-junction shown in the picture, this driver',
    options: [
      'Need not stop the vehicle when there are no vehicles on the main road',
      'Must stop the vehicle',
      'Must stop the vehicle only when turning right',
      'Need not stop the vehicle when turning left',
    ],
  },
  'lv-a-q25': {
    text: ROAD_LINE_QUESTION,
    options: [
      'Give way line',
      'Stop line at traffic signal lights or at places controlled by the police',
      'Stop line at a stop sign',
      'Give way line at a roundabout',
    ],
  },
  'lv-a-q26': {
    text: SIGN_QUESTION,
    options: [
      'Road closed ahead',
      'Railway level crossing ahead',
      'Unprotected railway level crossing',
      'Unprotected railway level crossing ahead',
    ],
  },
  'lv-a-q27': {
    text: SIGN_QUESTION,
    options: ['Compulsory roundabout', 'No entry', 'Road closed to buses and lorries', 'Road closed'],
  },
  'lv-a-q28': {
    text: SIGN_QUESTION,
    options: [
      'Slippery road ahead',
      'Winding road ahead',
      'Dangerous junction ahead',
      'Road narrows ahead',
    ],
  },
  'lv-a-q29': {
    text: SIGN_QUESTION,
    options: [
      'Y-junction ahead',
      'Road narrows ahead',
      'End of dual carriageway ahead',
      'Narrow bridge ahead',
    ],
  },
  'lv-a-q30': {
    text: SIGN_QUESTION,
    options: ['Compulsory roundabout ahead', 'Compulsory roundabout', 'Roundabout ahead', 'Roundabout'],
  },
  'lv-a-q31': {
    text: SIGN_QUESTION,
    options: ['Turn left and stop', 'Must turn left', 'Priority for turning left', 'Must turn left ahead'],
  },
  'lv-a-q32': {
    text: SIGN_QUESTION,
    options: ['An information sign', 'A warning sign', 'A prohibitory sign', 'A mandatory sign'],
  },
  'lv-a-q33': {
    text: SIGN_QUESTION,
    options: [
      'Double bend to the left ahead',
      'Hairpin bend to the left ahead',
      'Bend to the left ahead',
      'Place where a U-turn can be made ahead',
    ],
  },
  'lv-a-q34': {
    text: SIGN_QUESTION,
    options: [
      'Road closed to all vehicles',
      'Road closed',
      'Road closed to cars and bicycles',
      'Entry of cars and bicycles is prohibited',
    ],
  },
  'lv-a-q35': {
    text: SIGN_QUESTION,
    options: ['Roundabout ahead', 'Parking place', 'Stop', 'Stop ahead'],
  },
  'lv-a-q36': {
    text: SIGN_QUESTION,
    options: [
      'Start of dual carriageway ahead',
      'Road narrows ahead',
      'End of dual carriageway ahead',
      'Narrow bridge ahead',
    ],
  },
  'lv-a-q37': {
    text: SIGN_QUESTION,
    options: ['Speed limit', 'Normal speed', 'Minimum speed', 'Speed limit within town limits'],
  },
  'lv-a-q38': {
    text: SIGN_QUESTION,
    options: [
      'A junction ahead',
      'Parking and standing are prohibited on odd days',
      'Parking and standing are prohibited on even days',
      'Parking and standing are prohibited',
    ],
  },
  'lv-a-q39': {
    text: NEXT_LIGHT_QUESTION,
    options: ['Green', 'Amber', 'Red and amber', 'Amber and green'],
  },
  'lv-a-q40': {
    text: SIGN_QUESTION,
    options: [
      'End of priority for oncoming vehicles',
      'No entry',
      'Overtaking is prohibited',
      'Parking is prohibited on even days',
    ],
  },

  // Heavy Vehicle Practice Paper A, questions 41-45
  'hv-a-q41': {
    text: 'When the engine of the vehicle you are driving has overheated and the water is boiling, what should you do when topping up the water?',
    options: [
      'There is no need to pay attention to the engine of the vehicle',
      'Water should be added after stopping the engine',
      'Water should be added while the engine is running',
      'Both of the above statements are correct',
    ],
  },
  'hv-a-q42': {
    text: 'If an electrical fault occurs in the vehicle you are driving and you smell wires burning, what should you do immediately?',
    options: [
      'Switch off all the lights of the vehicle',
      'Turn off the main switch',
      'Remove the fuse',
      'Disconnect the battery cable',
    ],
  },
  'hv-a-q43': {
    text: 'What should be done to reduce the danger when a vehicle is skidding?',
    options: [
      'The danger cannot be reduced while skidding',
      'Apply the brakes immediately and control the speed',
      'Without braking, turn the steering wheel in the direction opposite to the skid',
      'Control the vehicle with the gears and steer properly in the direction of the skid',
    ],
  },
  'hv-a-q44': {
    text: 'In a vehicle that uses brake fluid, if the brake pedal goes all the way down, what does it indicate?',
    options: [
      'There is a fault in the brake pedal',
      'The brakes are binding (brakes too tight)',
      'The brakes are working properly',
      'There is a brake fluid leak',
    ],
  },
  'hv-a-q45': {
    text: 'If the vehicle pulls to the left when the brakes are applied, what does it indicate?',
    options: [
      'The air pressures of the tyres differ from one another',
      'There is a brake fluid leak at the front left wheel',
      'There is a brake fluid leak at the front right wheel',
      'There is no brake fluid at the rear wheels',
    ],
  },
}
