// Settings and password recovery rules that need no database: input validation (including
// that protected fields are never read), tokens and the e-mail contents.
// Run with: npm test

import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'
import env from '../config/env.js'
import {
  frontendUrl,
  sendEmailChangeVerification,
  sendPasswordResetEmail,
  setEmailTransport,
} from '../services/emailService.js'
import { TOKEN_PATTERN, createToken, hashToken } from '../utils/tokenUtils.js'
import {
  validateChangePasswordInput,
  validateForgotPasswordInput,
  validateProfileInput,
  validateResetPasswordInput,
  validateTokenInput,
} from '../utils/validationUtils.js'

const rejects400 = (run, field) =>
  assert.throws(run, (error) => error.statusCode === 400 && (!field || Boolean(error.errors?.[field])))

describe('validateProfileInput', () => {
  test('reads only the name, the e-mail and the current password', () => {
    const input = validateProfileInput({
      name: '  Nimal   Perera ',
      email: ' Nimal@Example.COM ',
      currentPassword: 'secret-123',
      drivingSchoolId: 'JDS_STD_999',
      role: 'admin',
      status: 'inactive',
      id: 1,
      passwordHash: 'x',
      profilePicture: '../../etc/passwd',
    })
    assert.deepEqual(input, { name: 'Nimal Perera', email: 'nimal@example.com', currentPassword: 'secret-123' })
  })

  test('refuses a missing, too short or too long name and an invalid e-mail', () => {
    rejects400(() => validateProfileInput({ name: '', email: 'a@b.lk' }), 'name')
    rejects400(() => validateProfileInput({ name: 'A', email: 'a@b.lk' }), 'name')
    rejects400(() => validateProfileInput({ name: 'A'.repeat(101), email: 'a@b.lk' }), 'name')
    rejects400(() => validateProfileInput({ name: 'Nimal', email: 'not-an-email' }), 'email')
    rejects400(() => validateProfileInput({ name: 'Nimal', email: '' }), 'email')
  })
})

describe('validateChangePasswordInput', () => {
  const valid = { currentPassword: 'old-pass-1', newPassword: 'new-pass-1', confirmPassword: 'new-pass-1' }

  test('accepts a valid change', () => {
    assert.deepEqual(validateChangePasswordInput(valid), { currentPassword: 'old-pass-1', newPassword: 'new-pass-1' })
  })

  test('needs the current password, a policy-compliant new one and a matching confirmation', () => {
    rejects400(() => validateChangePasswordInput({ ...valid, currentPassword: '' }), 'currentPassword')
    rejects400(() => validateChangePasswordInput({ ...valid, newPassword: 'short', confirmPassword: 'short' }), 'newPassword')
    rejects400(() => validateChangePasswordInput({ ...valid, confirmPassword: 'other-pass' }), 'confirmPassword')
    rejects400(() => validateChangePasswordInput({ ...valid, newPassword: 'old-pass-1', confirmPassword: 'old-pass-1' }), 'newPassword')
  })
})

describe('password recovery input', () => {
  test('forgot password reads a valid e-mail only', () => {
    assert.deepEqual(validateForgotPasswordInput({ email: ' A@B.lk ', drivingSchoolId: 'x' }), { email: 'a@b.lk' })
    rejects400(() => validateForgotPasswordInput({ email: 'nope' }), 'email')
    rejects400(() => validateForgotPasswordInput({}), 'email')
  })

  test('a token must have the shape of one', () => {
    const { token } = createToken()
    assert.deepEqual(validateTokenInput({ token }), { token })
    for (const bad of ['', 'short', `${token}x`, token.replace(/.$/, '!'), 42, null]) {
      assert.throws(() => validateTokenInput({ token: bad }), (error) => error.code === 'LINK_INVALID')
    }
  })

  test('reset password needs a valid password twice', () => {
    const { token } = createToken()
    assert.deepEqual(validateResetPasswordInput({ token, password: 'new-pass-1', confirmPassword: 'new-pass-1' }), {
      token,
      password: 'new-pass-1',
    })
    rejects400(() => validateResetPasswordInput({ token, password: 'short', confirmPassword: 'short' }), 'password')
    rejects400(() => validateResetPasswordInput({ token, password: 'new-pass-1', confirmPassword: 'x' }), 'confirmPassword')
  })
})

describe('tokens', () => {
  test('are random, URL-safe and stored only as a SHA-256 hash', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => createToken().token))
    assert.equal(tokens.size, 200)
    const { token, tokenHash } = createToken()
    assert.match(token, TOKEN_PATTERN)
    assert.match(tokenHash, /^[0-9a-f]{64}$/)
    assert.equal(hashToken(token), tokenHash)
    assert.notEqual(tokenHash, token)
  })
})

describe('e-mails', () => {
  const sent = []
  setEmailTransport(async (email) => {
    sent.push(email)
  })
  after(() => setEmailTransport(null))

  test('links point to the frontend address of the environment', () => {
    const url = new URL(frontendUrl('/reset-password', { token: 'abc' }))
    assert.equal(url.origin, new URL(env.clientUrl).origin)
    assert.equal(url.pathname, '/reset-password')
    assert.equal(url.searchParams.get('token'), 'abc')
  })

  test('the reset e-mail carries the link and the expiry, never a password', async () => {
    await sendPasswordResetEmail(
      { email: 'a@b.lk', name: 'Nimal', drivingSchoolId: 'JDS_STD_001' },
      { resetUrl: 'http://x/reset-password?token=t', expiryMinutes: 30 },
    )
    const { templateParams } = sent.at(-1)
    assert.equal(templateParams.to_email, 'a@b.lk')
    assert.equal(templateParams.reset_url, 'http://x/reset-password?token=t')
    assert.equal(templateParams.action_url, templateParams.reset_url)
    assert.equal(templateParams.expiry_minutes, '30')
    assert.equal(templateParams.driving_school_id, 'JDS_STD_001')
    assert.ok(!Object.keys(templateParams).some((key) => /password$/i.test(key)))
  })

  test('the e-mail change confirmation goes to the new address', async () => {
    await sendEmailChangeVerification({ email: 'new@b.lk', name: 'Nimal' }, { verificationUrl: 'http://x/v', expiryMinutes: 60 })
    assert.equal(sent.at(-1).templateParams.to_email, 'new@b.lk')
    assert.equal(sent.at(-1).templateParams.verification_url, 'http://x/v')
  })
})
