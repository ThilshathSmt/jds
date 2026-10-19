// Shared plumbing for the API tests: the app on a free port, requests with their own client
// address (so the per-client limits of one test do not affect the next), temporary accounts
// and captured e-mails. Everything a kit creates is deleted by `cleanUp()`.

import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import app from '../../app.js'
import pool, { testConnection } from '../../config/database.js'
import * as userModel from '../../models/userModel.js'
import { setEmailTransport } from '../../services/emailService.js'
import { hashPassword } from '../../utils/passwordUtils.js'
import { SESSION_COOKIE } from '../../utils/sessionUtils.js'

export const isDatabaseReachable = () =>
  testConnection().then(
    () => true,
    () => false,
  )

export const TEST_PASSWORD = 'Initial-pass-1'

export const createApiTestKit = () => {
  const run = randomBytes(3).toString('hex').toUpperCase()
  let server
  let baseUrl
  let ipCounter = 0
  const userIds = []
  const emails = []
  let waiters = []
  // Replaced by tests that need sending to fail or to be slow
  let deliver = async () => {}

  const kit = {
    run,
    emails,

    start: async () => {
      app.set('trust proxy', true)
      setEmailTransport(async (email) => {
        await deliver(email)
        const waiter = waiters.shift()
        if (waiter) waiter(email)
        else emails.push(email)
      })
      await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve)
      })
      baseUrl = `http://127.0.0.1:${server.address().port}`
    },

    // Deletes the accounts made here (with everything that belongs to them) and stops
    cleanUp: async () => {
      setEmailTransport(null)
      waiters = []
      if (userIds.length > 0) {
        await pool.query('DELETE FROM users WHERE id IN (?)', [userIds])
      }
      await new Promise((resolve) => server.close(resolve))
      await pool.end()
    },

    // `fn(email)` runs before an e-mail counts as sent: throw to make sending fail
    setDelivery: (fn) => {
      deliver = fn ?? (async () => {})
    },

    call: async (method, path, { cookie, body, form } = {}) => {
      const headers = { 'x-forwarded-for': `10.88.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` }
      if (cookie) headers.cookie = cookie
      if (body !== undefined) headers['content-type'] = 'application/json'
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      })
      const type = response.headers.get('content-type') ?? ''
      const payload = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer())
      return { status: response.status, body: payload, type, headers: response.headers }
    },

    // A temporary account of `role`, signed in. Returns { id, drivingSchoolId, email, cookie }.
    createSignedInUser: async (key, role) => {
      const drivingSchoolId = `JDS_TEST_${run}_${key.toUpperCase()}`
      const email = `test-${run.toLowerCase()}-${key}@example.test`
      const id = await userModel.create({
        drivingSchoolId,
        name: `Test ${key}`,
        email,
        passwordHash: await hashPassword(TEST_PASSWORD),
        role,
      })
      userIds.push(id)
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.89.0.${userIds.length}` },
        body: JSON.stringify({ drivingSchoolId, password: TEST_PASSWORD }),
      })
      assert.equal(response.status, 200, `login of the test ${role}`)
      const cookie = response.headers
        .getSetCookie()
        .find((value) => value.startsWith(`${SESSION_COOKIE}=`))
        .split(';')[0]
      return { id, drivingSchoolId, email, cookie }
    },

    // The next e-mail sent (waits for one sent after the response)
    nextEmail: (timeoutMs = 3000) =>
      new Promise((resolve, reject) => {
        if (emails.length > 0) return resolve(emails.shift())
        const timer = setTimeout(() => reject(new Error('no e-mail was sent')), timeoutMs)
        waiters.push((email) => {
          clearTimeout(timer)
          resolve(email)
        })
      }),

    expectNoEmail: async (waitMs = 300) => {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      assert.equal(emails.length, 0, 'no e-mail may have been sent')
    },
  }
  return kit
}
