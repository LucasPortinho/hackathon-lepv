import 'dotenv/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_PATH ?? 'sqlite.db');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Usa a transação nativa: há uma única conexão síncrona, então os repositories chamados
// dentro de `fn` participam dela, e transações aninhadas viram savepoints.
export const transaction = <T>(fn: () => T): T => sqlite.transaction(fn)();
