import { randomInt } from 'node:crypto'

// Returns a new array with the items in random order (Fisher-Yates). Every order is
// equally likely; the random numbers come from the operating system, not Math.random.
export const shuffle = (items) => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1)
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
