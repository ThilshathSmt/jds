// Tokens for the links sent by e-mail. A token is 32 random bytes from the operating
// system's secure generator; only its SHA-256 hash is stored, so a copy of the database is
// not enough to use a link.

import { createHash, randomBytes } from 'node:crypto'

// base64url of 32 bytes: always 43 characters of A-Z a-z 0-9 - _
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export const createToken = () => {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashToken(token) }
}
