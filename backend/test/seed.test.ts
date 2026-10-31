import './env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { db } from '../src/db';
import { DEMO_TEACHER_ID as T } from '../src/db/seed/data/catalog';
import { ensureDemoDatabase, resetDemoDatabase } from '../src/db/seed';
import { listRuns } from '../src/services/agent-runs/agent-run.service';
import { getDashboard } from '../src/services/dashboard/dashboard.service';
import { listDiagnostics } from '../src/services/diagnostics/diagnostic.service';
import { listExams } from '../src/services/exams/exam.service';
import { listNotifications } from '../src/services/notifications/notification.service';
import { listStudents } from '../src/services/profiles/profile.service';
import { search } from '../src/services/search/search.service';
import { processBatch, createBatch } from '../src/services/uploads/upload.service';

before(() => ensureDemoDatabase());

describe('seed da demonstração', () => {
  it('cria tabelas STRICT, triggers e user_version', () => {
    assert.equal(db.$client.pragma('user_version', { simple: true }), 3);
    const sql = db.$client.prepare<[], { sql: string }>("SELECT sql FROM sqlite_master WHERE name = 'teachers'").get()!.sql;
    assert.match(sql, /STRICT$/);
    assert.equal(db.$client.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger'").pluck().get(), 6);
    assert.deepEqual(db.$client.pragma('foreign_key_check'), []);
  });

  it('povoa as telas principais', () => {
    assert.equal(listStudents(T, 'mat').length, 52);
    assert.ok(listStudents(T, 'mat').every((s) => s.review === 'rascunho'));
    const dashboard = getDashboard(T, { classId: 'c-2b', subjectId: 'mat', periodId: 'b3' });
    assert.equal(dashboard.rows.length, 34);
    assert.equal(dashboard.subtopics.length, 8);
    assert.equal(dashboard.kpis.examsProcessed, 3);
    assert.ok(dashboard.pendingReviews > 0);
    assert.equal(listExams(T).find((e) => e.id === 'e-trig-3')?.partialReads, 2);
    assert.equal(listExams(T).length, 6);
    assert.equal(listRuns(T).length, 7);
    assert.equal(listNotifications(T).length, 3);
    assert.ok(search(T, 'gabriela').some((r) => r.kind === 'aluno'));
  });

  it('deixa o diagnóstico de exemplo aguardando revisão', () => {
    const [d] = listDiagnostics(T);
    assert.equal(d.id, 'd-cossenos');
    assert.equal(d.stage, 'revisao');
    assert.ok(d.perStudent.length > 0);
    assert.ok(d.perStudent.some((p) => p.items.some((i) => i.adaptedFor)));
  });

  it('simula a correção de um envio com folhas parciais', async () => {
    const batch = createBatch(T, 'e-leis', [{ name: 'respostas.pdf', size: 10, kind: 'respostas' }]);
    const summary = await processBatch(T, batch.id);
    assert.equal(summary.sheets, 34);
    assert.deepEqual(summary.partial.map((p) => p.name), ['Felipe Araújo', 'Nicole Teixeira']);
    assert.equal(summary.profiles, 34);
  });

  it('preserva os dados nos starts seguintes e recria no reset', async () => {
    assert.equal(await ensureDemoDatabase(), false);
    assert.equal(listExams(T).find((e) => e.id === 'e-leis')?.status, 'corrigida');
    await resetDemoDatabase();
    assert.equal(listExams(T).find((e) => e.id === 'e-leis')?.status, 'rascunho');
  });
});
