// The e-mail giving a newly approved student their Driving School ID, through the HTTP API,
// against the database configured in .env (after `npm run db:setup`). The tests make their
// own applications and accounts and delete them at the end, together with the IDs issued
// for them; the student ID counter is put back as it was. E-mails are captured, not sent.
// Skipped when the database is unreachable.
// Run with: npm test

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import pool from '../config/database.js'
import env from '../config/env.js'
import * as applicationModel from '../models/registrationApplicationModel.js'
import { createApiTestKit, isDatabaseReachable } from './helpers/apiTestKit.js'

const databaseReady = await isDatabaseReachable()
const STUDENT_PREFIX = 'JDS_STD_'
const APPROVAL_PARAMS = ['to_email', 'to_name', 'subject', 'driving_school_id', 'registration_url', 'app_name', 'message']

describe('Approval e-mail API', { skip: !databaseReady && 'database is not reachable' }, () => {
  const kit = createApiTestKit()
  const applicationIds = []
  let admin
  let student
  let counterBefore

  const counter = async () => {
    const [rows] = await pool.execute('SELECT last_number FROM driving_school_id_sequences WHERE prefix = ?', [STUDENT_PREFIX])
    return rows[0]?.last_number ?? null
  }

  // A NEW first-time application, straight into the database (the public form is not the
  // subject here). `email` may be null: the form does not require one.
  const createApplication = async (key, email = `applicant-${kit.run.toLowerCase()}-${key}@example.test`) => {
    const [[pkg]] = await pool.query('SELECT id, name, price FROM driving_school_packages ORDER BY id LIMIT 1')
    const id = await applicationModel.create({
      fullName: `Applicant ${key}`,
      mobileNumber: '0771234567',
      email,
      nic: '200012345678',
      address: 'Test address',
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      minimumPayment: pkg.price,
      paymentMethod: 'visit-branch',
    })
    applicationIds.push(id)
    return id
  }

  const approve = (id, cookie = admin.cookie) =>
    kit.call('POST', `/api/admin/registration-forms/${id}/approve`, { cookie })
  const retry = (id, cookie = admin.cookie) =>
    kit.call('POST', `/api/admin/registration-forms/${id}/approval-email`, { cookie })
  const row = (id) => applicationModel.findById(id)
  const countUsers = async () => Number((await pool.query('SELECT COUNT(*) AS n FROM users'))[0][0].n)
  const idRows = async (drivingSchoolId) =>
    (await pool.execute('SELECT id FROM driving_school_ids WHERE driving_school_id = ?', [drivingSchoolId]))[0].length

  before(async () => {
    counterBefore = await counter()
    await kit.start()
    admin = await kit.createSignedInUser('admin', 'admin')
    student = await kit.createSignedInUser('student', 'student')
  })

  after(async () => {
    kit.setDelivery(null)
    const [rows] = applicationIds.length
      ? await pool.query('SELECT driving_school_id FROM registration_applications WHERE id IN (?)', [applicationIds])
      : [[]]
    const issued = rows.map((r) => r.driving_school_id).filter(Boolean)
    if (applicationIds.length) await pool.query('DELETE FROM registration_applications WHERE id IN (?)', [applicationIds])
    if (issued.length) await pool.query('DELETE FROM driving_school_ids WHERE driving_school_id IN (?)', [issued])
    // Give the numbers back, unless a real ID was issued meanwhile
    const counterAfter = await counter()
    if (issued.length && counterAfter !== null) {
      if (counterBefore === null) {
        await pool.execute('DELETE FROM driving_school_id_sequences WHERE prefix = ? AND last_number = ?', [STUDENT_PREFIX, counterAfter])
      } else {
        await pool.execute('UPDATE driving_school_id_sequences SET last_number = ? WHERE prefix = ? AND last_number = ?', [
          counterBefore,
          STUDENT_PREFIX,
          counterAfter,
        ])
      }
    }
    await kit.cleanUp()
  })

  test('approving e-mails the issued Driving School ID to the application address', async () => {
    const id = await createApplication('ok')
    const usersBefore = await countUsers()
    const response = await approve(id)
    assert.equal(response.status, 200)
    const { application } = response.body.data
    assert.match(application.drivingSchoolId, /^JDS_STD_\d+$/)
    assert.match(response.body.message, /e-mailed to the student/)
    assert.equal(application.approvalEmail.status, 'SENT')

    const email = await kit.nextEmail()
    assert.equal(email.templateId, env.emailjs.approvalTemplateId)
    for (const name of APPROVAL_PARAMS) assert.ok(email.templateParams[name], `template parameter ${name}`)
    assert.equal(email.templateParams.to_email, `applicant-${kit.run.toLowerCase()}-ok@example.test`)
    assert.equal(email.templateParams.to_name, 'Applicant ok')
    assert.equal(email.templateParams.driving_school_id, application.drivingSchoolId)
    assert.equal(email.templateParams.registration_url, new URL('/register', env.clientUrl).toString())
    assert.match(email.templateParams.message, new RegExp(application.drivingSchoolId))
    assert.ok(!Object.keys(email.templateParams).some((key) => /password|token|key/i.test(key)))

    // The ID in the e-mail is the one saved, issued once; no account was created
    const saved = await row(id)
    assert.equal(saved.driving_school_id, application.drivingSchoolId)
    assert.equal(saved.approval_email_status, 'SENT')
    assert.ok(saved.approval_email_sent_at)
    assert.equal(await idRows(application.drivingSchoolId), 1)
    assert.equal(await countUsers(), usersBefore)
  })

  test('approving again or retrying after it was sent sends nothing and changes no ID', async () => {
    const id = await createApplication('twice')
    const { drivingSchoolId } = (await approve(id)).body.data.application
    await kit.nextEmail()

    const again = await approve(id)
    assert.equal(again.status, 409)
    const resend = await retry(id)
    assert.equal(resend.status, 409)
    await kit.expectNoEmail()
    assert.equal((await row(id)).driving_school_id, drivingSchoolId)
    assert.equal(await idRows(drivingSchoolId), 1)
  })

  test('a failed e-mail keeps the approval and its ID; a retry sends it with the same ID', async () => {
    const id = await createApplication('fails')
    kit.setDelivery(async () => {
      throw new Error('EmailJS refused the e-mail (HTTP 400): The template ID is invalid')
    })
    const response = await approve(id)
    kit.setDelivery(null)
    assert.equal(response.status, 200)
    const { application } = response.body.data
    assert.equal(application.status, 'APPROVED')
    assert.equal(application.approvalEmail.status, 'FAILED')
    assert.match(application.approvalEmail.error, /template ID is invalid/)
    assert.match(response.body.message, /could not be sent/)
    assert.equal(kit.emails.length, 0)

    const retried = await retry(id)
    assert.equal(retried.status, 200)
    assert.equal(retried.body.data.application.approvalEmail.status, 'SENT')
    assert.equal(retried.body.data.application.drivingSchoolId, application.drivingSchoolId)
    const email = await kit.nextEmail()
    assert.equal(email.templateParams.driving_school_id, application.drivingSchoolId)
    assert.equal(await idRows(application.drivingSchoolId), 1)
    assert.equal((await row(id)).approval_email_error, null)
  })

  test('simultaneous retries send one e-mail', async () => {
    const id = await createApplication('race')
    kit.setDelivery(async () => {
      throw new Error('temporarily unavailable')
    })
    await approve(id)
    // Slow sending, so both retries are in flight together
    kit.setDelivery(() => new Promise((resolve) => setTimeout(resolve, 300)))
    const results = await Promise.all([retry(id), retry(id), retry(id)])
    kit.setDelivery(null)
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409])
    await kit.nextEmail()
    await kit.expectNoEmail(500)
    assert.equal((await row(id)).approval_email_status, 'SENT')
  })

  test('an application without an e-mail address is approved without an e-mail', async () => {
    const id = await createApplication('noemail', null)
    const response = await approve(id)
    assert.equal(response.status, 200)
    assert.equal(response.body.data.application.approvalEmail.status, 'NO_EMAIL')
    assert.match(response.body.message, /no e-mail address/)
    await kit.expectNoEmail()
    assert.equal((await retry(id)).status, 409)
    assert.ok((await row(id)).driving_school_id)
  })

  test('suspended (not approved) applications get no e-mail and no ID', async () => {
    const id = await createApplication('suspended')
    assert.equal((await kit.call('POST', `/api/admin/registration-forms/${id}/suspend`, { cookie: admin.cookie })).status, 200)
    assert.equal((await approve(id)).status, 409)
    assert.equal((await retry(id)).status, 409)
    await kit.expectNoEmail()
    const saved = await row(id)
    assert.equal(saved.driving_school_id, null)
    assert.equal(saved.approval_email_status, null)
  })

  test('a pending application has no approval e-mail to retry', async () => {
    const id = await createApplication('pending')
    assert.equal((await retry(id)).status, 409)
    await kit.expectNoEmail()
    assert.equal((await row(id)).approval_email_status, null)
  })

  test('only admins can approve or resend', async () => {
    const id = await createApplication('auth')
    assert.equal((await approve(id, student.cookie)).status, 403)
    assert.equal((await retry(id, student.cookie)).status, 403)
    assert.equal((await kit.call('POST', `/api/admin/registration-forms/${id}/approve`)).status, 401)
    await kit.expectNoEmail()
    assert.equal((await row(id)).status, 'NEW')
  })
})
