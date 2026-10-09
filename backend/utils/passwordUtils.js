import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS)

export const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash)

// Hash compared against when no account matches, so a login attempt takes the same time
// whether or not the Driving School ID exists.
let dummyHash
export const getDummyHash = async () => {
  dummyHash ??= await hashPassword('no-such-account')
  return dummyHash
}
