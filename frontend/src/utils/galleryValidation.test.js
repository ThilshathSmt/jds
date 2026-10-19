// The Gallery upload checks made before anything is sent. Run with: npm test

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GALLERY_IMAGE_MAX_BYTES, getGalleryFileError } from './galleryValidation.js'

const file = (name, size = 1000) => ({ name, size })

test('JPG, PNG and WebP images up to 5 MB are accepted', () => {
  for (const name of ['a.jpg', 'b.JPEG', 'c.png', 'd.webp']) assert.equal(getGalleryFileError(file(name)), '', name)
  assert.equal(getGalleryFileError(file('e.png', GALLERY_IMAGE_MAX_BYTES)), '')
})

test('other types and larger files are refused', () => {
  for (const name of ['a.gif', 'b.svg', 'c.exe', 'd.png.exe', 'noextension']) {
    assert.notEqual(getGalleryFileError(file(name)), '', name)
  }
  assert.equal(getGalleryFileError(file('big.jpg', GALLERY_IMAGE_MAX_BYTES + 1)), 'Larger than 5 MB.')
})
