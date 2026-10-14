// Creates the database (if needed) and applies database/schema.sql.
// Usage: npm run db:setup
//
// Safe to run on a database that already has data: tables are only created when missing
// (CREATE TABLE IF NOT EXISTS), and the steps below bring an older database up to the
// current schema without dropping a table, a column or a row. Every step first checks
// whether it is still needed, so running the script again changes nothing.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'
import env, { requireDatabaseEnv } from '../config/env.js'

// Tables and columns that were given a new name. Renamed before the schema is applied, so
// the data stays in the table instead of a second, empty table being created beside it.
// (Their indexes and foreign keys keep the names they were created with.)
const RENAMED_TABLES = [
  { from: 'exam_cycle_requests', to: 'exam_reattempt_requests' },
  { from: 'exam_cycle_request_documents', to: 'exam_reattempt_request_documents' },
]
const RENAMED_COLUMNS = [
  { table: 'notifications', from: 'exam_cycle_request_id', to: 'exam_reattempt_request_id' },
  { table: 'exam_reattempt_requests', from: 'from_cycle_id', to: 'cycle_id' },
]

// Columns added after a table was first created. CREATE TABLE IF NOT EXISTS leaves an
// existing table untouched, so each one is added here when it is missing.
const ADDED_COLUMNS = [
  {
    table: 'users',
    column: 'session_version',
    definition: 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER status',
  },
  {
    table: 'notifications',
    column: 'exam_reattempt_request_id',
    definition: 'INT NULL AFTER exam_date_request_id',
  },
  // Rows from before every failure had its own payment were all for a third failure:
  // NULL until filled in below, and a medical report was always required for them
  {
    table: 'exam_reattempt_requests',
    column: 'failed_attempt_id',
    definition: 'INT NULL AFTER cycle_id',
  },
  {
    table: 'exam_reattempt_requests',
    column: 'medical_report_required',
    definition: 'TINYINT(1) NOT NULL DEFAULT 1 AFTER failed_attempt_id',
  },
  {
    table: 'exam_reattempt_requests',
    column: 'approved',
    definition: 'TINYINT NULL AFTER pending',
  },
  // Account lock after three failed attempts, and the reapplication that lifts it
  { table: 'users', column: 'locked_at', definition: 'TIMESTAMP NULL AFTER session_version' },
  {
    table: 'registration_applications',
    column: 'application_type',
    definition: "ENUM('NEW_STUDENT', 'REAPPLICATION') NOT NULL DEFAULT 'NEW_STUDENT' AFTER driving_school_id",
  },
  { table: 'registration_applications', column: 'user_id', definition: 'INT NULL AFTER application_type' },
  { table: 'registration_applications', column: 'pending', definition: 'TINYINT NULL AFTER user_id' },
  {
    table: 'registration_applications',
    column: 'rejection_reason',
    definition: 'VARCHAR(300) NULL AFTER pending',
  },
  {
    table: 'registration_applications',
    column: 'reviewed_by',
    definition: 'INT NULL AFTER rejection_reason',
  },
  {
    table: 'registration_applications',
    column: 'reviewed_at',
    definition: 'TIMESTAMP NULL AFTER reviewed_by',
  },
  { table: 'exam_attempt_cycles', column: 'application_id', definition: 'INT NULL AFTER source_request_id' },
  {
    table: 'exam_attempt_cycles',
    column: 'status',
    definition: "ENUM('ACTIVE', 'EXHAUSTED', 'PASSED') NOT NULL DEFAULT 'ACTIVE' AFTER application_id",
  },
  {
    table: 'exam_reattempt_requests',
    column: 'reapplication_id',
    definition: 'INT NULL AFTER medical_report_required',
  },
  {
    table: 'notifications',
    column: 'registration_application_id',
    definition: 'INT NULL AFTER exam_reattempt_request_id',
  },
  // A reapplication's confirmation that the student has obtained a new medical report
  {
    table: 'registration_applications',
    column: 'new_medical_report_confirmed',
    definition: 'TINYINT(1) NULL AFTER pending',
  },
  // The reattempt fee owed for a failed first or second attempt, fixed when it is recorded
  {
    table: 'licence_exam_attempts',
    column: 'reattempt_fee',
    definition: 'INT UNSIGNED NULL AFTER result',
  },
  // The vehicle an instructor is responsible for (NULL until assigned)
  {
    table: 'users',
    column: 'responsibility',
    definition: "ENUM('VAN', 'MOTOR_BIKE', 'THREE_WHEELER', 'BUS', 'TRACTOR') NULL AFTER locked_at",
  },
  // The new medical report a cycle started from (NULL for first cycles and older ones)
  {
    table: 'exam_attempt_cycles',
    column: 'medical_report_document_id',
    definition: 'INT NULL AFTER application_id',
  },
]

// ENUM columns that were given another value. The column is redefined with the full list
// when the value is missing; existing rows keep the value they have.
const ADDED_ENUM_VALUES = [
  {
    table: 'registration_applications',
    column: 'status',
    value: 'REJECTED',
    definition: "ENUM('NEW', 'APPROVED', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'NEW'",
  },
  {
    table: 'application_documents',
    column: 'document_type',
    value: 'medical_report',
    definition: "ENUM('payment_receipt', 'medical_report') NOT NULL",
  },
]

// Values for the added columns of rows that existed before them
const BACKFILLS = [
  // An older request was made after the third failure of its cycle
  `UPDATE exam_reattempt_requests r
     JOIN licence_exam_attempts a ON a.cycle_id = r.cycle_id AND a.attempt_number = 3
      SET r.failed_attempt_id = a.id
    WHERE r.failed_attempt_id IS NULL`,
  "UPDATE exam_reattempt_requests SET approved = 1 WHERE status = 'APPROVED' AND approved IS NULL",
  // Failures recorded before the fee was stored with them: the amount already submitted for
  // them, or else the fee that applied then (LKR 2,000)
  `UPDATE licence_exam_attempts a
      SET a.reattempt_fee = COALESCE(
            (SELECT MAX(r.fee_amount) FROM exam_reattempt_requests r WHERE r.failed_attempt_id = a.id),
            2000)
    WHERE a.result = 'FAILED' AND a.attempt_number < 3 AND a.reattempt_fee IS NULL`,
  // A cycle started by an approved reapplication uses that application's medical report
  `UPDATE exam_attempt_cycles c
      SET c.medical_report_document_id = (
            SELECT MAX(d.id) FROM application_documents d
             WHERE d.application_id = c.application_id AND d.document_type = 'medical_report')
    WHERE c.medical_report_document_id IS NULL AND c.cycle_number > 1 AND c.application_id IS NOT NULL`,
  // The first cycle of a student belongs to the application they registered with
  `UPDATE exam_attempt_cycles c
     JOIN users u ON u.id = c.user_id
     JOIN registration_applications a ON a.driving_school_id = u.driving_school_id
      SET c.application_id = a.id
    WHERE c.cycle_number = 1 AND c.application_id IS NULL`,
  // What the recorded results say about each cycle
  `UPDATE exam_attempt_cycles c SET c.status = 'PASSED'
    WHERE c.status = 'ACTIVE'
      AND EXISTS (SELECT 1 FROM licence_exam_attempts a WHERE a.cycle_id = c.id AND a.result = 'PASSED')`,
  `UPDATE exam_attempt_cycles c SET c.status = 'EXHAUSTED'
    WHERE c.status = 'ACTIVE'
      AND (SELECT COUNT(*) FROM licence_exam_attempts a
            WHERE a.cycle_id = c.id AND a.result = 'FAILED') >= 3`,
  // A student whose latest cycle is exhausted needs a reapplication: the account is locked
  `UPDATE users u SET u.locked_at = NOW()
    WHERE u.locked_at IS NULL AND u.role = 'student'
      AND EXISTS (
        SELECT 1 FROM exam_attempt_cycles c
         WHERE c.user_id = u.id AND c.status = 'EXHAUSTED'
           AND c.cycle_number = (SELECT MAX(c2.cycle_number) FROM exam_attempt_cycles c2 WHERE c2.user_id = u.id))`,
]

const ADDED_INDEXES = [
  {
    table: 'exam_reattempt_requests',
    name: 'uq_exam_reattempt_requests_one_approved',
    definition: 'UNIQUE KEY uq_exam_reattempt_requests_one_approved (failed_attempt_id, approved)',
  },
  {
    table: 'registration_applications',
    name: 'uq_registration_applications_one_pending',
    definition: 'UNIQUE KEY uq_registration_applications_one_pending (user_id, pending)',
  },
  // One application starts one cycle at most. Not added (with a warning) while existing
  // rows break that rule: nothing is changed or removed to make it fit.
  {
    table: 'exam_attempt_cycles',
    name: 'uq_exam_attempt_cycles_application',
    definition: 'UNIQUE KEY uq_exam_attempt_cycles_application (application_id)',
    duplicates: `SELECT application_id FROM exam_attempt_cycles
                  WHERE application_id IS NOT NULL GROUP BY application_id HAVING COUNT(*) > 1 LIMIT 1`,
  },
]

// Foreign keys of the added columns. One is looked for by what it does (column and the
// table it refers to), because a renamed column keeps its foreign key under its old name.
const ADDED_FOREIGN_KEYS = [
  {
    table: 'notifications',
    column: 'exam_reattempt_request_id',
    references: 'exam_reattempt_requests',
    name: 'fk_notifications_exam_reattempt_request',
  },
  {
    table: 'exam_reattempt_requests',
    column: 'failed_attempt_id',
    references: 'licence_exam_attempts',
    name: 'fk_exam_reattempt_requests_attempt',
  },
  {
    table: 'registration_applications',
    column: 'user_id',
    references: 'users',
    name: 'fk_registration_applications_user',
  },
  {
    table: 'registration_applications',
    column: 'reviewed_by',
    references: 'users',
    name: 'fk_registration_applications_reviewed_by',
    onDelete: 'SET NULL',
  },
  {
    table: 'exam_attempt_cycles',
    column: 'application_id',
    references: 'registration_applications',
    name: 'fk_exam_attempt_cycles_application',
    onDelete: 'SET NULL',
  },
  {
    table: 'exam_reattempt_requests',
    column: 'reapplication_id',
    references: 'registration_applications',
    name: 'fk_exam_reattempt_requests_reapplication',
    onDelete: 'SET NULL',
  },
  {
    table: 'notifications',
    column: 'registration_application_id',
    references: 'registration_applications',
    name: 'fk_notifications_registration_application',
  },
  {
    table: 'exam_attempt_cycles',
    column: 'medical_report_document_id',
    references: 'application_documents',
    name: 'fk_exam_attempt_cycles_medical_report',
    onDelete: 'SET NULL',
  },
]

// True when the information_schema query finds at least one row
const exists = async (connection, sql, params) => {
  const [rows] = await connection.execute(`SELECT 1 FROM information_schema.${sql} LIMIT 1`, [
    env.db.name,
    ...params,
  ])
  return rows.length > 0
}
const tableExists = (connection, table) =>
  exists(connection, 'TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [table])
const columnExists = (connection, table, column) =>
  exists(connection, 'COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [
    table,
    column,
  ])

const renameTablesAndColumns = async (connection) => {
  for (const { from, to } of RENAMED_TABLES) {
    if ((await tableExists(connection, from)) && !(await tableExists(connection, to))) {
      await connection.query(`RENAME TABLE \`${from}\` TO \`${to}\``)
      console.log(`Renamed table ${from} to ${to}.`)
    }
  }
  for (const { table, from, to } of RENAMED_COLUMNS) {
    if ((await columnExists(connection, table, from)) && !(await columnExists(connection, table, to))) {
      await connection.query(`ALTER TABLE \`${table}\` RENAME COLUMN \`${from}\` TO \`${to}\``)
      console.log(`Renamed column ${table}.${from} to ${to}.`)
    }
  }
}

const addMissingColumns = async (connection) => {
  for (const { table, column, definition } of ADDED_COLUMNS) {
    if (!(await columnExists(connection, table, column))) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
      console.log(`Added column ${table}.${column}.`)
    }
  }
}

const addMissingEnumValues = async (connection) => {
  for (const { table, column, value, definition } of ADDED_ENUM_VALUES) {
    const [rows] = await connection.execute(
      `SELECT COLUMN_TYPE AS type FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [env.db.name, table, column],
    )
    if (rows.length > 0 && !rows[0].type.includes(`'${value}'`)) {
      await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`)
      console.log(`Added value ${value} to ${table}.${column}.`)
    }
  }
}

const addMissingIndexes = async (connection) => {
  for (const { table, name, definition, duplicates } of ADDED_INDEXES) {
    const present = await exists(
      connection,
      'STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?',
      [table, name],
    )
    if (!present && duplicates) {
      const [rows] = await connection.query(duplicates)
      if (rows.length > 0) {
        console.warn(`Index ${table}.${name} not added: existing rows have duplicate values.`)
        continue
      }
    }
    if (!present) {
      await connection.query(`ALTER TABLE \`${table}\` ADD ${definition}`)
      console.log(`Added index ${table}.${name}.`)
    }
  }
}

const addMissingForeignKeys = async (connection) => {
  for (const { table, column, references, name, onDelete = 'CASCADE' } of ADDED_FOREIGN_KEYS) {
    const present = await exists(
      connection,
      `KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
         AND REFERENCED_TABLE_NAME = ?`,
      [table, column, references],
    )
    if (!present) {
      await connection.query(
        `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\`
           FOREIGN KEY (\`${column}\`) REFERENCES \`${references}\` (id) ON DELETE ${onDelete}`,
      )
      console.log(`Added foreign key ${table}.${name}.`)
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
    await renameTablesAndColumns(connection)
    const schema = await readFile(path.join(env.backendRoot, 'database', 'schema.sql'), 'utf8')
    await connection.query(schema)
    await addMissingColumns(connection)
    await addMissingEnumValues(connection)
    for (const backfill of BACKFILLS) await connection.query(backfill)
    await addMissingIndexes(connection)
    await addMissingForeignKeys(connection)
    console.log(`Database "${env.db.name}" is ready: all tables in database/schema.sql exist.`)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error(`Database setup failed: ${error.message}`)
  process.exit(1)
})
