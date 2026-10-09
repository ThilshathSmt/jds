import env, { requireAuthEnv, requireDatabaseEnv } from './config/env.js'

const start = async () => {
  requireDatabaseEnv()
  requireAuthEnv()

  // Imported after the checks above so a missing setting gives a clear message first
  const { testConnection } = await import('./config/database.js')
  try {
    await testConnection()
    console.log(`MySQL connected: ${env.db.name} @ ${env.db.host}:${env.db.port}`)
  } catch (error) {
    throw new Error(
      `MySQL connection failed (${error.code ?? error.message}). Check the DB_* values in .env and run "npm run db:setup".`,
    )
  }

  const { default: app } = await import('./app.js')
  app.listen(env.port, () => {
    console.log(`Jeslan Driving School API listening on http://localhost:${env.port}`)
  })
}

start().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
