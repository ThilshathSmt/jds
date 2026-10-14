// Rules of the physical driving licence examination attempts.
// The server applies these: a number sent by the browser is never trusted.

// How many times a student may sit the examination with one medical report
export const ATTEMPTS_PER_CYCLE = 3

// Paid to the school after every failed attempt, before another examination date can be
// requested. Whole Sri Lankan rupees.
export const REATTEMPT_FEE = 2000

export const EXAM_RESULTS = ['PASSED', 'FAILED']
