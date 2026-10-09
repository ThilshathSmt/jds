// Creates the database (if needed) and applies database/schema.sql.
// Usage: npm run db:setup

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'
import env, { requireDatabaseEnv } from '../config/env.js'

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
    console.log(`Database "${env.db.name}" is ready: all tables in database/schema.sql exist.`)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error(`Database setup failed: ${error.message}`)
  process.exit(1)
})
