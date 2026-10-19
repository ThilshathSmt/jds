// Settings, password recovery and e-mail change through the HTTP API, against the database
// configured in .env (after `npm run db:setup`). The tests create their own accounts (one
// per role, a locked one and an inactive one) and delete them, with everything belonging
// to them, at the end. E-mails are captured instead of sent. Skipped when the database is
// unreachable.
// Run with: npm test

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import app from '../app.js'
import pool, { testConnection } from '../config/database.js'
import { PROFILE_PICTURE_MAX_BYTES } from '../config/account.js'
import * as userModel from '../models/userModel.js'
import { setEmailTransport } from '../services/emailService.js'
import { hashPassword } from '../utils/passwordUtils.js'
import { SESSION_COOKIE } from '../utils/sessionUtils.js'

const databaseReady = await testConnection().then(
  () => true,
  () => false,
)

const RUN = randomBytes(3).toString('hex').toUpperCase()
const PASSWORD = 'Initial-pass-1'
const GENERIC = 'If an account exists for this email address, password reset instructions will be sent.'
// The smallest genuine PNG: the signature and an IHDR chunk is enough for the content check
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex')

describe('Settings and account recovery API', { skip: !databaseReady && 'database is not reachable' }, () => {
  let server
  let baseUrl
  const accounts = {}
  const emails = []
  let emailWaiters = []
  let ipCounter = 0

  // ---- helpers

  // Each request comes from its own address unless one is given, so the per-client limits
  // do not interfere between tests (the limit itself is tested separately)
  const call = async (method, path, { cookie, body, form, ip } = {}) => {
    const headers = { 'x-forwarded-for': ip ?? `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` }
    if (cookie) headers.cookie = cookie
    if (body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
    const setCookie = response.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`))
    const type = response.headers.get('content-type') ?? ''
    const payload = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer())
    return { status: response.status, body: payload, type, cookie: setCookie?.split(';')[0] }
  }

  const login = (drivingSchoolId, password = PASSWORD) =>
    call('POST', '/api/auth/login', { body: { drivingSchoolId, password } })

  const signIn = async (account, password = PASSWORD) => {
    const response = await login(account.drivingSchoolId, password)
    assert.equal(response.status, 200, `login of ${account.drivingSchoolId}`)
    return response.cookie
  }

  const createAccount = async (key, role, { locked = false, status = 'active' } = {}) => {
    const drivingSchoolId = `JDS_TEST_${RUN}_${key.toUpperCase()}`
    const email = `test-${RUN.toLowerCase()}-${key}@example.test`
    const id = await userModel.create({
      drivingSchoolId,
      name: `Test ${key}`,
      email,
      passwordHash: await hashPassword(PASSWORD),
      role,
    })
    if (locked) await userModel.setLocked(id, new Date())
    if (status !== 'active') await userModel.updateStatus(id, status)
    accounts[key] = { id, drivingSchoolId, email }
  }

  const row = async (id) => userModel.findById(id)

  // The next e-mail captured (the forgot-password e-mail is sent after the response)
  const nextEmail = (timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      if (emails.length > 0) return resolve(emails.shift())
      const timer = setTimeout(() => reject(new Error('no e-mail was sent')), timeoutMs)
      emailWaiters.push((email) => {
        clearTimeout(timer)
        resolve(email)
      })
    })
  const noEmail = async (waitMs = 400) => {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    assert.equal(emails.length, 0, 'no e-mail may have been sent')
  }
  const tokenFrom = (email) => new URL(email.templateParams.action_url).searchParams.get('token')

  before(async () => {
    app.set('trust proxy', true)
    setEmailTransport(async (email) => {
      const waiter = emailWaiters.shift()
      if (waiter) waiter(email)
      else emails.push(email)
    })
    await createAccount('student', 'student')
    await createAccount('instructor', 'instructor')
    await createAccount('admin', 'admin')
    await createAccount('other', 'student')
    await createAccount('locked', 'student', { locked: true })
    await createAccount('inactive', 'student', { status: 'inactive' })
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    setEmailTransport(null)
    emailWaiters = []
    // Removes their pictures' files too
    for (const { id } of Object.values(accounts)) {
      const user = await row(id)
      if (user?.profile_picture) {
        const { removeProfilePicture } = await import('../services/profileService.js')
        await removeProfilePicture(id)
      }
    }
    await pool.execute(`DELETE FROM users WHERE driving_school_id LIKE ?`, [`JDS_TEST_${RUN}_%`])
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  })

  // ---- Settings

  test('every role reaches its own Settings profile, and only when signed in', async () => {
    assert.equal((await call('GET', '/api/profile')).status, 401)
    for (const key of ['student', 'instructor', 'admin']) {
      const response = await call('GET', '/api/profile', { cookie: await signIn(accounts[key]) })
      assert.equal(response.status, 200)
      assert.equal(response.body.data.profile.id, accounts[key].id)
      assert.equal(response.body.data.profile.drivingSchoolId, accounts[key].drivingSchoolId)
      assert.equal(response.body.data.profile.passwordHash, undefined)
      assert.equal(response.body.data.profile.password_hash, undefined)
    }
  })

  test('the name is saved and kept after signing in again; protected fields cannot be changed', async () => {
    const { student, other } = accounts
    const cookie = await signIn(student)
    const response = await call('PUT', '/api/profile', {
      cookie,
      body: {
        name: 'Renamed Student',
        email: student.email,
        drivingSchoolId: 'JDS_STD_HACKED',
        role: 'admin',
        status: 'inactive',
        id: other.id,
        userId: other.id,
        password_hash: 'x',
      },
    })
    assert.equal(response.status, 200)
    const saved = await row(student.id)
    assert.equal(saved.name, 'Renamed Student')
    assert.equal(saved.driving_school_id, student.drivingSchoolId)
    assert.equal(saved.role, 'student')
    assert.equal(saved.status, 'active')
    // The other account is untouched
    assert.equal((await row(other.id)).name, 'Test other')

    const again = await login(student.drivingSchoolId)
    assert.equal(again.body.data.user.name, 'Renamed Student')
    assert.equal(again.body.data.user.drivingSchoolId, student.drivingSchoolId)
  })

  test('admin and instructor IDs cannot be changed either', async () => {
    for (const key of ['instructor', 'admin']) {
      const cookie = await signIn(accounts[key])
      const response = await call('PUT', '/api/profile', {
        cookie,
        body: { name: `Renamed ${key}`, email: accounts[key].email, drivingSchoolId: 'JDS_admin_2', role: 'student' },
      })
      assert.equal(response.status, 200)
      const saved = await row(accounts[key].id)
      assert.equal(saved.driving_school_id, accounts[key].drivingSchoolId)
      assert.equal(saved.role, key)
    }
  })

  test('validation errors are reported per field', async () => {
    const cookie = await signIn(accounts.student)
    const response = await call('PUT', '/api/profile', { cookie, body: { name: '', email: 'nope' } })
    assert.equal(response.status, 400)
    assert.ok(response.body.errors.name)
    assert.ok(response.body.errors.email)
  })

  // ---- Change password

  test('changing the password needs the current one, signs out other sessions and keeps this one', async () => {
    const { instructor } = accounts
    const cookie = await signIn(instructor)
    const otherDevice = await signIn(instructor)

    const wrong = await call('PUT', '/api/profile/password', {
      cookie,
      body: { currentPassword: 'Wrong-pass-1', newPassword: 'Changed-pass-1', confirmPassword: 'Changed-pass-1' },
    })
    assert.equal(wrong.status, 400)
    assert.ok(wrong.body.errors.currentPassword)

    const mismatch = await call('PUT', '/api/profile/password', {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: 'Changed-pass-1', confirmPassword: 'Changed-pass-2' },
    })
    assert.equal(mismatch.status, 400)
    assert.ok(mismatch.body.errors.confirmPassword)

    const changed = await call('PUT', '/api/profile/password', {
      cookie,
      body: { currentPassword: PASSWORD, newPassword: 'Changed-pass-1', confirmPassword: 'Changed-pass-1' },
    })
    assert.equal(changed.status, 200)
    assert.ok(changed.cookie, 'a new session cookie is issued')
    assert.notEqual((await row(instructor.id)).password_hash, 'Changed-pass-1')
    assert.match((await row(instructor.id)).password_hash, /^\$2[aby]\$/)

    assert.equal((await call('GET', '/api/profile', { cookie: changed.cookie })).status, 200)
    assert.equal((await call('GET', '/api/profile', { cookie: otherDevice })).status, 401)
    assert.equal((await login(instructor.drivingSchoolId)).status, 401)
    assert.equal((await login(instructor.drivingSchoolId, 'Changed-pass-1')).status, 200)
  })

  // ---- E-mail change

  test('a new e-mail needs the current password and is not used before it is confirmed', async () => {
    const { admin, other } = accounts
    const cookie = await signIn(admin)
    const newEmail = `test-${RUN.toLowerCase()}-admin-new@example.test`

    const noPassword = await call('PUT', '/api/profile', { cookie, body: { name: 'Renamed admin', email: newEmail } })
    assert.equal(noPassword.status, 400)
    assert.ok(noPassword.body.errors.currentPassword)

    const wrongPassword = await call('PUT', '/api/profile', {
      cookie,
      body: { name: 'Renamed admin', email: newEmail, currentPassword: 'Wrong-pass-1' },
    })
    assert.equal(wrongPassword.status, 400)

    // Someone else's address is refused: no account takeover through Settings
    const taken = await call('PUT', '/api/profile', {
      cookie,
      body: { name: 'Renamed admin', email: other.email, currentPassword: PASSWORD },
    })
    assert.equal(taken.status, 409)
    assert.ok(taken.body.errors.email)
    assert.equal(emails.length, 0)

    const requested = await call('PUT', '/api/profile', {
      cookie,
      body: { name: 'Renamed admin', email: newEmail, currentPassword: PASSWORD },
    })
    assert.equal(requested.status, 200)
    assert.equal(requested.body.data.verificationSentTo, newEmail)
    assert.equal(requested.body.data.profile.pendingEmail, newEmail)
    const email = await nextEmail()
    assert.equal(email.templateParams.to_email, newEmail)
    assert.match(email.templateParams.verification_url, /\/verify-email\?token=/)

    // Until confirmed, the old address is the account's: password recovery still uses it
    assert.equal((await row(admin.id)).email, admin.email)
    await call('POST', '/api/auth/forgot-password', { body: { email: admin.email } })
    assert.equal((await nextEmail()).templateParams.to_email, admin.email)
    assert.equal((await call('POST', '/api/auth/forgot-password', { body: { email: newEmail } })).status, 200)
    await noEmail()

    const confirmed = await call('POST', '/api/auth/verify-email', { body: { token: tokenFrom(email) } })
    assert.equal(confirmed.status, 200)
    assert.equal((await row(admin.id)).email, newEmail)
    assert.equal((await call('GET', '/api/profile', { cookie })).body.data.profile.pendingEmail, null)

    const reused = await call('POST', '/api/auth/verify-email', { body: { token: tokenFrom(email) } })
    assert.equal(reused.status, 400)
    assert.equal(reused.body.code, 'LINK_USED')
    accounts.admin.email = newEmail
  })

  test('an address confirmed by one account cannot be confirmed by another', async () => {
    const { student, other } = accounts
    const shared = `test-${RUN.toLowerCase()}-shared@example.test`
    for (const account of [student, other]) {
      const cookie = await signIn(account)
      const name = (await row(account.id)).name
      const response = await call('PUT', '/api/profile', { cookie, body: { name, email: shared, currentPassword: PASSWORD } })
      assert.equal(response.status, 200)
    }
    const [first, second] = [await nextEmail(), await nextEmail()]
    assert.equal((await call('POST', '/api/auth/verify-email', { body: { token: tokenFrom(first) } })).status, 200)
    const late = await call('POST', '/api/auth/verify-email', { body: { token: tokenFrom(second) } })
    assert.equal(late.status, 409)
    assert.equal((await row(other.id)).email, other.email)
    accounts.student.email = shared
  })

  // ---- Forgot password

  test('the answer is the same for known and unknown addresses; only a known one gets an e-mail', async () => {
    const unknown = await call('POST', '/api/auth/forgot-password', {
      body: { email: `nobody-${RUN.toLowerCase()}@example.test` },
    })
    assert.equal(unknown.status, 200)
    assert.equal(unknown.body.message, GENERIC)
    await noEmail()

    const known = await call('POST', '/api/auth/forgot-password', { body: { email: accounts.other.email.toUpperCase() } })
    assert.equal(known.status, 200)
    assert.equal(known.body.message, GENERIC)
    const email = await nextEmail()
    assert.equal(email.templateParams.to_email, accounts.other.email)
    assert.match(email.templateParams.reset_url, /\/reset-password\?token=[A-Za-z0-9_-]{43}$/)
    assert.equal(email.templateParams.expiry_minutes, '30')

    // Asked again at once: same answer, no second e-mail
    const repeated = await call('POST', '/api/auth/forgot-password', { body: { email: accounts.other.email } })
    assert.equal(repeated.body.message, GENERIC)
    await noEmail()
    accounts.other.resetToken = tokenFrom(email)
  })

  test('a valid link resets the password once; the old password stops working', async () => {
    const { other } = accounts
    const token = other.resetToken
    const check = await call('POST', '/api/auth/reset-password/check', { body: { token } })
    assert.equal(check.status, 200)
    assert.equal(check.body.data.drivingSchoolId, other.drivingSchoolId)

    const mismatch = await call('POST', '/api/auth/reset-password', {
      body: { token, password: 'Recovered-pass-1', confirmPassword: 'Other-pass-1' },
    })
    assert.equal(mismatch.status, 400)

    const before = await row(other.id)
    const reset = await call('POST', '/api/auth/reset-password', {
      body: { token, password: 'Recovered-pass-1', confirmPassword: 'Recovered-pass-1' },
    })
    assert.equal(reset.status, 200)
    assert.equal(reset.body.data.locked, false)

    const afterReset = await row(other.id)
    assert.equal(afterReset.driving_school_id, before.driving_school_id)
    assert.equal(afterReset.role, before.role)
    assert.equal(afterReset.status, before.status)
    assert.equal(afterReset.email, before.email)
    assert.equal(afterReset.session_version, before.session_version + 1)
    assert.equal((await login(other.drivingSchoolId)).status, 401)
    assert.equal((await login(other.drivingSchoolId, 'Recovered-pass-1')).status, 200)

    for (const path of ['/api/auth/reset-password/check', '/api/auth/reset-password']) {
      const reused = await call('POST', path, { body: { token, password: 'Another-pass-1', confirmPassword: 'Another-pass-1' } })
      assert.equal(reused.status, 400)
      assert.equal(reused.body.code, 'LINK_USED')
    }
    assert.equal((await login(other.drivingSchoolId, 'Recovered-pass-1')).status, 200)
  })

  test('unknown, malformed, expired and replaced links are refused', async () => {
    const unknown = await call('POST', '/api/auth/reset-password/check', {
      body: { token: randomBytes(32).toString('base64url') },
    })
    assert.equal(unknown.status, 400)
    assert.equal(unknown.body.code, 'LINK_INVALID')
    const malformed = await call('POST', '/api/auth/reset-password/check', { body: { token: "' OR 1=1 --" } })
    assert.equal(malformed.status, 400)
    assert.equal(malformed.body.code, 'LINK_INVALID')

    const { student } = accounts
    await call('POST', '/api/auth/forgot-password', { body: { email: student.email } })
    const first = tokenFrom(await nextEmail())
    // A newer request replaces the link (made older than the resend interval first)
    await pool.execute(
      "UPDATE account_tokens SET created_at = DATE_SUB(created_at, INTERVAL 5 MINUTE) WHERE user_id = ? AND purpose = 'PASSWORD_RESET'",
      [student.id],
    )
    await call('POST', '/api/auth/forgot-password', { body: { email: student.email } })
    const second = tokenFrom(await nextEmail())
    const replaced = await call('POST', '/api/auth/reset-password/check', { body: { token: first } })
    assert.equal(replaced.body.code, 'LINK_USED')
    assert.equal((await call('POST', '/api/auth/reset-password/check', { body: { token: second } })).status, 200)

    await pool.execute(
      "UPDATE account_tokens SET expires_at = DATE_SUB(expires_at, INTERVAL 1 DAY) WHERE user_id = ? AND purpose = 'PASSWORD_RESET' AND used_at IS NULL",
      [student.id],
    )
    const expired = await call('POST', '/api/auth/reset-password', {
      body: { token: second, password: 'Expired-pass-1', confirmPassword: 'Expired-pass-1' },
    })
    assert.equal(expired.status, 400)
    assert.equal(expired.body.code, 'LINK_EXPIRED')
    assert.equal((await login(student.drivingSchoolId)).status, 200, 'the password did not change')
  })

  test('recovery never unlocks a locked account, and an inactive account gets no e-mail', async () => {
    const { locked, inactive } = accounts
    await call('POST', '/api/auth/forgot-password', { body: { email: locked.email } })
    const token = tokenFrom(await nextEmail())
    const reset = await call('POST', '/api/auth/reset-password', {
      body: { token, password: 'Locked-pass-1', confirmPassword: 'Locked-pass-1' },
    })
    assert.equal(reset.status, 200)
    assert.equal(reset.body.data.locked, true)
    assert.notEqual((await row(locked.id)).locked_at, null)
    const loginAttempt = await login(locked.drivingSchoolId, 'Locked-pass-1')
    assert.equal(loginAttempt.status, 403)
    assert.equal(loginAttempt.body.code, 'REAPPLICATION_REQUIRED')

    const inactiveRequest = await call('POST', '/api/auth/forgot-password', { body: { email: inactive.email } })
    assert.equal(inactiveRequest.body.message, GENERIC)
    await noEmail()
    assert.equal((await row(inactive.id)).status, 'inactive')
  })

  test('forgot password is rate limited per client', async () => {
    const ip = '10.99.0.1'
    const statuses = []
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await call('POST', '/api/auth/forgot-password', { ip, body: { email: `nobody${index}@example.test` } })).status)
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429])
  })

  // ---- Profile picture

  test('a genuine image is saved, served to its owner only, replaced and removed', async () => {
    const { student, other } = accounts
    const cookie = await signIn(student)
    const upload = (bytes, name) => {
      const form = new FormData()
      form.append('picture', new Blob([bytes]), name)
      return call('POST', '/api/profile/picture', { cookie, form })
    }

    const fake = await upload(Buffer.from('not really a png'), 'avatar.png')
    assert.equal(fake.status, 400)
    assert.ok(fake.body.errors.picture)
    assert.equal((await upload(Buffer.from('GIF89a'), 'avatar.gif')).status, 400)
    assert.equal((await upload(Buffer.alloc(PROFILE_PICTURE_MAX_BYTES + 1), 'big.png')).status, 400)
    assert.equal((await row(student.id)).profile_picture, null)

    const saved = await upload(PNG, 'avatar.png')
    assert.equal(saved.status, 200)
    const firstUrl = saved.body.data.profile.profilePictureUrl
    assert.match(firstUrl, /^\/api\/profile\/picture\?v=/)

    const picture = await call('GET', '/api/profile/picture', { cookie })
    assert.equal(picture.status, 200)
    assert.equal(picture.type, 'image/png')
    assert.deepEqual(picture.body, PNG)
    // Kept after signing in again
    assert.equal((await login(student.drivingSchoolId)).body.data.user.profilePictureUrl, firstUrl)
    // Another account only ever gets its own picture
    assert.equal((await call('GET', '/api/profile/picture', { cookie: await signIn(other, 'Recovered-pass-1') })).status, 404)
    assert.equal((await call('GET', '/api/profile/picture')).status, 401)

    const replaced = await upload(PNG, 'second.png')
    assert.notEqual(replaced.body.data.profile.profilePictureUrl, firstUrl)

    const removed = await call('DELETE', '/api/profile/picture', { cookie })
    assert.equal(removed.body.data.profile.profilePictureUrl, null)
    assert.equal((await call('GET', '/api/profile/picture', { cookie })).status, 404)
  })
})
