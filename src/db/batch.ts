import type { Database } from './index'

// Statements come from Drizzle.toSQL() or static SQL, never user-provided SQL.
export async function batchStatements(db: Database, statements: { sql: string; params: unknown[] }[]) {
  if (statements.length === 0) return
  const queries = statements.map(statement => db.$client.prepare(statement.sql).bind(...statement.params))
  // D1 batches roll back every statement on failure. The installed Drizzle
  // version cannot batch db.run() queries that contain parameters.
  await db.$client.batch(queries)
}
