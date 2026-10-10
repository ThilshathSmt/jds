// Creates the database (if needed) and applies database/schema.sql.
// Usage: npm run db:setup

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'
import env, { requireDatabaseEnv } from '../config/env.js'

// Columns added after a table was first created. CREATE TABLE IF NOT EXISTS leaves an
// existing table untouched, so each one is added here when it is missing. Never drops data.
const ADDED_COLUMNS = [
  {
    table: 'users',
    column: 'session_version',
    definition: 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER status',
  },
]

const addMissingColumns = async (connection) => {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    const [rows] = await connection.execute(
      `SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
      [env.db.name, table, column],
    )
    if (rows.length === 0) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
      console.log(`Added column ${table}.${column}.`)
    }
  }
}

const run = async () => {
  requireDatabaseEnv()
  // The database name cannot be a query parameter, so only allow a plain identifier
  if (!/^[A-Za-z0-9_]+$/.test(env.db.name)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.')
  }

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  })

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await connection.query(`USE \`${env.db.name}\``)
    const schema = await readFile(path.join(env.backendRoot, 'database', 'schema.sql'), 'utf8')
    await connection.query(schema)
    await addMissingColumns(connection)
    console.log(`Database "${env.db.name}" is ready: all tables in database/schema.sql exist.`)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error(`Database setup failed: ${error.message}`)
  process.exit(1)
})
