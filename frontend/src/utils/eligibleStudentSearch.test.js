import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterEligibleDrivingSchoolIds } from './eligibleStudentSearch.js'

const ids = ['JDS_STD_0005', 'JDS_STD_0006', 'JDS_STD_0008', 'JDS_STD_0012', 'JDS_STD_0015', 'JDS_STD_0019']

test('numeric fragments match IDs with zero-padded suffixes', () => {
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, ' 19 '), ['JDS_STD_0019'])
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, '0005'), ['JDS_STD_0005'])
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, '12'), ['JDS_STD_0012'])
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, '000'), ids.slice(0, 3))
})

test('complete ID matching is case-insensitive and does not select an option', () => {
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, 'jds_std_0005'), ['JDS_STD_0005'])
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, ''), ids)
  assert.deepEqual(filterEligibleDrivingSchoolIds(ids, '9999'), [])
})
