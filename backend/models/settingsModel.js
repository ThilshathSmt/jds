// Database access for driving_school_packages and system_settings. No business logic here.
// Every function takes an optional `db` (pool or transaction connection).

import pool from '../config/database.js'

const PACKAGE_COLUMNS = 'id, name, price, is_active, sort_order, updated_at'

// Every package, in the order they are offered
export const findAllPackages = async (db = pool) => {
  const [rows] = await db.execute(`SELECT ${PACKAGE_COLUMNS} FROM driving_school_packages ORDER BY sort_order, id`)
  return rows
}

export const findActivePackages = async (db = pool) => {
  const [rows] = await db.execute(
    `SELECT ${PACKAGE_COLUMNS} FROM driving_school_packages WHERE is_active = 1 ORDER BY sort_order, id`,
  )
  return rows
}

// `lock` is 'update' (the row is being changed) or 'share' (it is being relied on: a
// change waits until the transaction ends)
export const findPackageById = async (id, db = pool, { lock } = {}) => {
  const suffix = lock === 'update' ? ' FOR UPDATE' : lock === 'share' ? ' LOCK IN SHARE MODE' : ''
  const [rows] = await db.execute(`SELECT ${PACKAGE_COLUMNS} FROM driving_school_packages WHERE id = ?${suffix}`, [id])
  return rows[0] ?? null
}

// Name comparison follows the column's collation (case-insensitive)
export const findPackageByName = async (name, db = pool) => {
  const [rows] = await db.execute(`SELECT ${PACKAGE_COLUMNS} FROM driving_school_packages WHERE name = ?`, [name])
  return rows[0] ?? null
}

export const countActivePackages = async (db = pool) => {
  const [rows] = await db.execute('SELECT COUNT(*) AS n FROM driving_school_packages WHERE is_active = 1')
  return Number(rows[0].n)
}

// Returns the new package's id; it is offered after the existing ones. Fails with
// ER_DUP_ENTRY when the name is taken.
export const createPackage = async ({ name, price, isActive, updatedBy }, db = pool) => {
  const [result] = await db.execute(
    `INSERT INTO driving_school_packages (name, price, is_active, sort_order, updated_by)
     SELECT ?, ?, ?, COALESCE(MAX(sort_order), 0) + 1, ? FROM driving_school_packages`,
    [name, price, isActive ? 1 : 0, updatedBy],
  )
  return result.insertId
}

// Fails with ER_DUP_ENTRY when the name is taken by another package
export const updatePackage = async (id, { name, price, isActive, updatedBy }, db = pool) => {
  await db.execute(
    'UPDATE driving_school_packages SET name = ?, price = ?, is_active = ?, updated_by = ? WHERE id = ?',
    [name, price, isActive ? 1 : 0, updatedBy, id],
  )
}

// { key: { value, updatedAt } } for every setting. `forUpdate` locks the rows.
export const findSettings = async (db = pool, { forUpdate = false } = {}) => {
  const [rows] = await db.execute(
    `SELECT setting_key, setting_value, updated_at FROM system_settings${forUpdate ? ' FOR UPDATE' : ''}`,
  )
  return Object.fromEntries(
    rows.map((row) => [row.setting_key, { value: Number(row.setting_value), updatedAt: row.updated_at }]),
  )
}

// Inserts the setting when it is missing, so a change is never lost
export const saveSetting = async (key, value, updatedBy, db = pool) => {
  await db.execute(
    `INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [key, value, updatedBy],
  )
}
