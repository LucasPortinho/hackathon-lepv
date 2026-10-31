import 'dotenv/config';
import { copyFileSync, existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const databasePath = process.env.DATABASE_PATH ?? 'sqlite.db';
const seedPath = process.env.SEED_DATABASE_PATH;

// Precisa vir antes de abrir o banco: `new Database` criaria um arquivo vazio.
if (seedPath && !existsSync(databasePath)) copyFileSync(seedPath, databasePath);

const sqlite = new Database(databasePath);
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Usa a transação nativa: há uma única conexão síncrona, então os repositories chamados
// dentro de `fn` participam dela, e transações aninhadas viram savepoints.
export const transaction = <T>(fn: () => T): T => sqlite.transaction(fn)();
