// Rules of the physical driving licence examination attempts.
// The server applies these: a number sent by the browser is never trusted.
// The reattempt fee is a setting the admins manage (system_settings.exam_reattempt_fee,
// see services/settingsService.js); it is not fixed here.

// How many times a student may sit the examination with one medical report
export const ATTEMPTS_PER_CYCLE = 3

export const EXAM_RESULTS = ['PASSED', 'FAILED']
