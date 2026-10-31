import { sql } from 'drizzle-orm';
import { db } from '.';
import * as schema from './schema';
import { creatorMetadataMigration } from './migrations/0002-creator-metadata';
import { examAnswerKeysMigration } from './migrations/0003-exam-answer-keys';
import { sheetImagesMigration } from './migrations/0004-sheet-images';

// Na ordem das versões: o índice 0 leva da versão 1 para a 2.
const MIGRATIONS = [creatorMetadataMigration, examAnswerKeysMigration, sheetImagesMigration];

// `sqliteTable` não declara STRICT nem triggers: esta é a migração explícita pedida em schema.md.
const withStrict = (statement: string) =>
  statement.startsWith('CREATE TABLE') ? statement.trimEnd().replace(/;?$/, ' STRICT;') : statement;

// O drizzle-kit acrescenta `Array.prototype.random`, e isso quebra o leitor de PDF: só é carregado
// quando o banco é criado, e a alteração é desfeita em seguida.
async function generateStatements() {
  const { generateSQLiteDrizzleJson, generateSQLiteMigration } = await import('drizzle-kit/api');
  const statements = await generateSQLiteMigration(await generateSQLiteDrizzleJson({}), await generateSQLiteDrizzleJson(schema));
  delete (Array.prototype as unknown as Record<string, unknown>).random;
  return statements;
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

/** Atualiza o banco já preenchido, sem executar dropSchema nem seed. */
export function migrateSchema() {
  const version = Number(db.$client.pragma('user_version', { simple: true }));
  if (version === schema.sqliteSchemaMetadata.userVersion) return true;
  if (version >= 1 && version < schema.sqliteSchemaMetadata.userVersion) {
    db.$client.transaction(() => MIGRATIONS.slice(version - 1).forEach((migration) => db.$client.exec(migration)))();
    db.$client.pragma(`user_version = ${schema.sqliteSchemaMetadata.userVersion}`);
    return true;
  }
  if (version !== 0) throw new Error(`Versão de banco não suportada: ${version}.`);
  return false;
}
