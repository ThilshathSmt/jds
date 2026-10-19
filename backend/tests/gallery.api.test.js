// The Gallery through the HTTP API, against the database configured in .env (after
// `npm run db:setup`). The tests remove every image they add (rows and files) and their
// temporary accounts; images already in the gallery are left alone. Skipped when the
// database is unreachable.
// Run with: npm test

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import pool from '../config/database.js'
import env from '../config/env.js'
import { GALLERY_IMAGE_MAX_BYTES } from '../config/gallery.js'
import { addImages, deleteImage, titleFromFileName } from '../services/galleryService.js'
import { createApiTestKit, isDatabaseReachable } from './helpers/apiTestKit.js'

const databaseReady = await isDatabaseReachable()

// The smallest genuine files: the content check reads the first bytes only
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex')
const JPEG = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex')
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(14)])

test('titles come from file names, without paths or markup', () => {
  assert.equal(titleFromFileName('summer_class-2026.jpg'), 'summer class 2026')
  assert.equal(titleFromFileName('../../etc/secret.png'), 'secret')
  assert.equal(titleFromFileName('C:\\Users\\me\\photo.jpg').endsWith('photo'), true)
  assert.equal(titleFromFileName('a<script>b.png'), 'ascriptb')
  assert.equal(titleFromFileName(''), 'Gallery image')
  assert.equal(titleFromFileName(`${'a'.repeat(300)}.png`).length, 150)
})

describe('Gallery API', { skip: !databaseReady && 'database is not reachable' }, () => {
  const kit = createApiTestKit()
  const added = new Set()
  let admin
  let student
  let instructor

  const form = (files) => {
    const body = new FormData()
    for (const [bytes, name] of files) body.append('images', new Blob([bytes]), name)
    return body
  }
  const upload = (files, cookie = admin.cookie) => kit.call('POST', '/api/admin/gallery', { cookie, form: form(files) })
  const filesOnDisk = async () => (await readdir(env.galleryUploadsDir).catch(() => [])).length
  const rowCount = async () => Number((await pool.query('SELECT COUNT(*) AS n FROM gallery_images'))[0][0].n)
  const track = (response) => {
    for (const image of response.body.data?.images ?? []) added.add(image.id)
    return response
  }

  before(async () => {
    await kit.start()
    admin = await kit.createSignedInUser('admin', 'admin')
    student = await kit.createSignedInUser('student', 'student')
    instructor = await kit.createSignedInUser('instructor', 'instructor')
  })

  after(async () => {
    for (const id of added) await deleteImage(id).catch(() => {})
    await kit.cleanUp()
  })

  test('anyone can read the public gallery', async () => {
    const response = await kit.call('GET', '/api/gallery')
    assert.equal(response.status, 200)
    assert.ok(Array.isArray(response.body.data.images))
  })

  test('students, instructors and visitors cannot upload, list as admin or delete', async () => {
    const before = [await rowCount(), await filesOnDisk()]
    assert.equal((await kit.call('POST', '/api/admin/gallery', { form: form([[PNG, 'a.png']]) })).status, 401)
    assert.equal((await upload([[PNG, 'a.png']], student.cookie)).status, 403)
    assert.equal((await upload([[PNG, 'a.png']], instructor.cookie)).status, 403)
    assert.equal((await kit.call('GET', '/api/admin/gallery', { cookie: student.cookie })).status, 403)
    assert.equal((await kit.call('DELETE', '/api/admin/gallery/1', { cookie: instructor.cookie })).status, 403)
    // Refused before the upload is read: nothing reached the disk
    assert.deepEqual([await rowCount(), await filesOnDisk()], before)
  })

  test('an admin uploads several images; they are public at once and served by id', async () => {
    const response = track(await upload([[PNG, 'Driving_lesson.png'], [JPEG, 'graduation-day.jpeg'], [WEBP, 'new car.webp']]))
    assert.equal(response.status, 201)
    const images = response.body.data.images
    assert.deepEqual(images.map((image) => image.title), ['Driving lesson', 'graduation day', 'new car'])

    const publicList = (await kit.call('GET', '/api/gallery')).body.data.images
    for (const image of images) {
      const listed = publicList.find((item) => item.id === image.id)
      assert.ok(listed, 'listed publicly')
      assert.equal(listed.originalName, undefined, 'the public list does not show upload details')
    }

    const served = await kit.call('GET', images[0].url)
    assert.equal(served.status, 200)
    assert.equal(served.type, 'image/png')
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(served.body, PNG)
    assert.equal((await kit.call('GET', images[1].url)).type, 'image/jpeg')
    assert.equal((await kit.call('GET', images[2].url)).type, 'image/webp')

    const adminList = (await kit.call('GET', '/api/admin/gallery', { cookie: admin.cookie })).body.data.images
    assert.equal(adminList.find((item) => item.id === images[0].id).originalName, 'Driving_lesson.png')
  })

  test('invalid uploads are refused and leave nothing behind', async () => {
    const before = [await rowCount(), await filesOnDisk()]
    const cases = [
      { files: [[Buffer.from('not an image at all'), 'fake.png']], why: 'fake PNG' },
      { files: [[Buffer.from('GIF89a'), 'anim.gif']], why: 'GIF' },
      { files: [[Buffer.from('<svg/>'), 'x.svg']], why: 'SVG' },
      { files: [[Buffer.from('MZ'), 'run.exe']], why: 'program' },
      { files: [[Buffer.alloc(GALLERY_IMAGE_MAX_BYTES + 1, 0xff), 'huge.jpg']], why: 'over 5 MB' },
      { files: [[PNG, 'good.png'], [Buffer.from('nope'), 'bad.jpg']], why: 'one bad file among good ones' },
      { files: Array.from({ length: 11 }, (unused, index) => [PNG, `many-${index}.png`]), why: 'eleven files' },
      { files: [], why: 'no file' },
    ]
    for (const { files, why } of cases) {
      const response = track(await upload(files))
      assert.equal(response.status, 400, why)
      assert.ok(response.body.errors?.images, `${why}: the error names the images field`)
    }
    assert.deepEqual([await rowCount(), await filesOnDisk()], before)
  })

  test('an admin deletes an image: it disappears from the gallery and the disk', async () => {
    const [image] = track(await upload([[PNG, 'to-delete.png']])).body.data.images
    const filesBefore = await filesOnDisk()

    assert.equal((await kit.call('DELETE', `/api/admin/gallery/${image.id}`, { cookie: student.cookie })).status, 403)
    const removed = await kit.call('DELETE', `/api/admin/gallery/${image.id}`, { cookie: admin.cookie })
    assert.equal(removed.status, 200)
    added.delete(image.id)

    assert.equal(await filesOnDisk(), filesBefore - 1)
    assert.equal((await kit.call('GET', image.url)).status, 404)
    assert.ok(!(await kit.call('GET', '/api/gallery')).body.data.images.some((item) => item.id === image.id))
    assert.equal((await kit.call('DELETE', `/api/admin/gallery/${image.id}`, { cookie: admin.cookie })).status, 404)
  })

  test('a database failure while saving deletes the uploaded files and records nothing', async () => {
    // As multer leaves them: genuine images under random names in the gallery folder
    await mkdir(env.galleryUploadsDir, { recursive: true })
    const files = []
    for (const [bytes, extension] of [[PNG, '.png'], [JPEG, '.jpg']]) {
      const filename = `${randomUUID()}${extension}`
      const filePath = path.join(env.galleryUploadsDir, filename)
      await writeFile(filePath, bytes)
      files.push({ filename, path: filePath, originalname: `db-failure${extension}`, size: bytes.length })
    }
    const rowsBefore = await rowCount()
    // No such account: the database refuses the rows (uploaded_by is a foreign key)
    await assert.rejects(addImages(files, 2147483647), (error) => error.code === 'ER_NO_REFERENCED_ROW_2')
    assert.equal(await rowCount(), rowsBefore)
    for (const file of files) {
      await assert.rejects(access(file.path), { code: 'ENOENT' }, `${file.filename} was deleted`)
    }
  })

  test('image addresses only accept an id: no path reaches the disk', async () => {
    for (const path of [
      '/api/gallery/..%2F..%2F.env/image',
      '/api/gallery/../../.env/image',
      '/api/gallery/abc/image',
      '/api/gallery/-1/image',
      '/api/gallery/999999999/image',
    ]) {
      const response = await kit.call('GET', path)
      assert.equal(response.status, 404, path)
      assert.match(response.type, /json/, `${path} serves no file`)
    }
  })
})
