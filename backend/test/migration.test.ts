import './env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { db } from '../src/db';
import { ensureDemoDatabase } from '../src/db/seed';
import { migrateSchema } from '../src/db/setup';

before(() => {
  // Banco antigo deliberadamente pequeno: comprova que o start migra sem reset/seed.
  db.$client.exec(`
    CREATE TABLE questions (id TEXT PRIMARY KEY, statement TEXT NOT NULL) STRICT;
    CREATE TABLE competency_gaps (id TEXT PRIMARY KEY, note TEXT NOT NULL) STRICT;
    CREATE TABLE diagnostic_items (id TEXT PRIMARY KEY, statement TEXT NOT NULL) STRICT;
    INSERT INTO questions VALUES ('q-old', 'Enunciado preservado');
    INSERT INTO competency_gaps VALUES ('gap-old', 'Observação preservada');
    INSERT INTO diagnostic_items VALUES ('item-old', 'Item preservado');
    CREATE VIEW legacy_questions AS SELECT id FROM questions;
    PRAGMA user_version = 1;
  `);
});

describe('migração aditiva da versão 1 para 2', () => {
  it('migra no start, preserva os dados e permite repetir a inicialização', async () => {
    assert.equal(await ensureDemoDatabase(), false);
    assert.equal(db.$client.pragma('user_version', { simple: true }), 2);
    const question = db.$client.prepare('SELECT * FROM questions').get() as Record<string, unknown>;
    assert.equal(question.id, 'q-old');
    assert.equal(question.statement, 'Enunciado preservado');
    assert.equal(question.alternatives, '[]');
    assert.equal(question.check_result, 'nao_verificavel');
    assert.equal(question.answer_key, null);
    assert.equal(question.difficulty, null);
    assert.equal((db.$client.prepare('SELECT note FROM competency_gaps').get() as { note: string }).note, 'Observação preservada');
    assert.equal((db.$client.prepare('SELECT statement FROM diagnostic_items').get() as { statement: string }).statement, 'Item preservado');
    assert.equal((db.$client.prepare('SELECT id FROM legacy_questions').get() as { id: string }).id, 'q-old');
    assert.equal(await ensureDemoDatabase(), false);
    assert.equal(migrateSchema(), true);
  });

  it('valida JSON, dificuldade, checagem e pré-requisito no SQLite', () => {
    for (const table of ['questions', 'diagnostic_items']) {
      for (const assignment of ["alternatives = 'invalid'", "alternatives = '{}'", "difficulty = 'extrema'", "check_result = 'unknown'"]) {
        assert.throws(() => db.$client.exec(`UPDATE ${table} SET ${assignment}`), /CHECK/);
      }
    }
    assert.throws(() => db.$client.exec("UPDATE competency_gaps SET prerequisite = ' '"), /CHECK/);
    assert.deepEqual(db.$client.pragma('foreign_key_check'), []);
    db.$client.pragma('user_version = 99');
    assert.throws(migrateSchema, /não suportada/);
    db.$client.pragma('user_version = 2');
  });
});
