import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { sql } from 'drizzle-orm';
import { db } from '.';
import * as schema from './schema';

// `sqliteTable` não declara STRICT nem triggers: esta é a migração explícita pedida em schema.md.
const withStrict = (statement: string) =>
  statement.startsWith('CREATE TABLE') ? statement.trimEnd().replace(/;?$/, ' STRICT;') : statement;

async function generateStatements() {
  const empty = await generateSQLiteDrizzleJson({});
  return generateSQLiteMigration(empty, await generateSQLiteDrizzleJson(schema));
}

export async function createSchema() {
  (await generateStatements()).forEach((statement) => db.run(sql.raw(withStrict(statement))));
  schema.sqliteTriggers.forEach((trigger) => db.run(trigger.statement));
  db.$client.pragma(`user_version = ${schema.sqliteSchemaMetadata.userVersion}`);
}

export function dropSchema() {
  const objects = db.$client.prepare<[], { type: string; name: string }>(
    "SELECT type, name FROM sqlite_master WHERE type IN ('view', 'table') AND name NOT LIKE 'sqlite_%' ORDER BY type = 'table'",
  ).all();
  db.$client.pragma('foreign_keys = OFF');
  objects.forEach(({ type, name }) => db.$client.exec(`DROP ${type.toUpperCase()} "${name}"`));
  db.$client.pragma('foreign_keys = ON');
}

export const hasSchema = () => db.$client.pragma('user_version', { simple: true }) === schema.sqliteSchemaMetadata.userVersion;
