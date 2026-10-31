import './env';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app';
import { db } from '../src/db';
import { createDatabase } from './setup';

const servers: Server[] = [];
const bases: Record<string, string> = {};
const examInput = {
  title: 'Prova HTTP', classId: 'c1', subjectId: 'mat', groupId: null, date: '2026-11-12',
  questions: [{ id: 'q1' }, { id: 'q2' }],
};

describe('metadados do CRIA por HTTP', () => {
  it('recebe os campos da questão e entrega pré-requisitos no contexto PED → CRIA', async () => {
    const metadata = { alternatives: ['2', '4'], answerKey: '4', solution: '2 + 2 = 4.', difficulty: 'facil', checkResult: 'ok' };
    const created = await request('/exams', { method: 'POST', body: {
      ...examInput, questions: [{ statement: 'Quanto é 2 + 2?', subtopicId: 'st-cossenos', points: 1, ...metadata }],
    } });
    assert.equal(created.status, 201);
    const [question] = (await request('/exams/' + created.body.id)).body.questions;
    for (const [key, value] of Object.entries(metadata)) assert.deepEqual(question[key], value);
    const invalid = await request('/exams', { method: 'POST', body: {
      ...examInput, questions: [{ statement: 'Q', subtopicId: 'st-cossenos', points: 1, checkResult: 'invalido' }],
    } });
    assert.equal(invalid.status, 400);

    const diagnostic = (await request('/diagnostics', { method: 'POST', body: { classId: 'c1', subtopicIds: ['st-cossenos'] } })).body;
    const path = '/diagnostics/' + diagnostic.id;
    let current = (await request(path + '/run-agent', { method: 'POST' })).body;
    if (current.stage === 'adaptacao') current = (await request(path + '/run-agent', { method: 'POST' })).body;
    const context = await request(path + '/creator-context');
    assert.equal(context.status, 200);
    const target = context.body.students.find((row: { student: { id: string } }) => row.student.id === 'ana');
    assert.ok(target.gaps[0].prerequisite);
    const item = { id: 'cria-http', subtopicId: 'st-cossenos', statement: 'Calcule 2 + 2.', ...metadata };
    const saved = await request(path + '/students/ana/items', { method: 'POST', body: { items: [item] } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.items[0].prerequisite, target.gaps[0].prerequisite);
    assert.equal(saved.body.items[0].checkResult, 'ok');
    assert.equal((await request(path + '/creator-context', { teacher: 't2' })).status, 404);
    assert.equal((await request(path + '/students/ana/items', { method: 'POST', body: { items: [{ ...item, alternatives: [2] }] } })).status, 400);
    assert.equal((await request(path + '/students/ana/items', { method: 'POST', body: { items: [{ ...item, difficulty: 'extrema' }] } })).status, 400);
    const persisted = (await request(path)).body.diagnostic.perStudent.find((row: { studentId: string }) => row.studentId === 'ana').items[0];
    assert.equal(persisted.solution, metadata.solution);
  });
});

before(async () => {
  await createDatabase();
  for (const teacherId of ['t1', 't2']) {
    const server = createApp({ teacherId }).listen(0, '127.0.0.1');
    servers.push(server);
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    bases[teacherId] = `http://127.0.0.1:${address.port}/api/v1`;
  }
});

after(async () => {
  for (const server of servers) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.$client.close();
});

async function request(path: string, options: { method?: string; body?: unknown; teacher?: string; raw?: string } = {}) {
  const { method = 'GET', body, teacher = 't1', raw } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(bases[teacher] + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : undefined };
}

describe('contratos HTTP da demonstração', () => {
  it('usa o professor configurado sem login', async () => {
    const me = await request('/teachers/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.id, 't1');
    assert.equal(me.body.preferences.theme, 'claro');
    assert.equal(me.headers.get('cache-control'), 'no-store');
    assert.equal((await request('/teachers/me', { teacher: 't2' })).body.id, 't2');
    assert.equal((await request('/auth/login', { method: 'POST', body: {} })).status, 404);
    assert.throws(() => createApp({ teacherId: '' }), /teacherId/);
  });

  it('padroniza JSON inválido, payload excessivo, validação e rota inexistente', async () => {
    const invalid = await request('/exams', { method: 'POST', raw: '{' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'INVALID_REQUEST');
    const oversized = await request('/exams', { method: 'POST', body: { title: 'x'.repeat(1024 * 1024 + 100) } });
    assert.equal(oversized.status, 413);
    const validation = await request('/dashboard/heatmap');
    assert.equal(validation.status, 400);
    assert.equal(validation.body.error.code, 'VALIDATION_ERROR');
    assert.ok(validation.body.error.details.some((issue: { path: string }) => issue.path === 'query.classId'));
    assert.equal((await request('/not-found')).status, 404);
  });
});

describe('catálogo, turmas e dashboard', () => {
  it('expõe catálogos e limita as consultas ao professor da demo', async () => {
    for (const path of ['/subjects', '/periods', '/needs', '/subjects/mat/subtopics', '/questions/bank']) {
      const result = await request(path);
      assert.equal(result.status, 200);
      assert.ok(Array.isArray(result.body));
    }
    assert.equal((await request('/subjects/missing/subtopics')).status, 404);
    const classes = await request('/classes?year=2026');
    assert.deepEqual(classes.body.map((cls: { id: string }) => cls.id), ['c1']);
    assert.deepEqual((await request('/classes?year=2025')).body, []);
    assert.equal((await request('/classes?year=2026junk')).status, 400);
    assert.equal((await request('/classes?year=2026&year=2025')).status, 400);
    assert.equal((await request('/classes?teacherId=t2')).status, 400);
    assert.equal((await request('/classes/c2')).status, 404);
    assert.equal((await request('/classes/c2/students')).status, 404);
    const students = await request('/classes/c1/students');
    assert.equal(students.status, 200);
    assert.equal(students.body.length, 4);
    assert.ok(Array.isArray(students.body[0].declaredNeeds));
  });

  it('mantém DashboardData, SubtopicInsight e notas ausentes', async () => {
    const query = '?classId=c1&subjectId=mat&periodId=b3';
    const dashboard = await request('/dashboard/heatmap' + query);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.rows.length, 4);
    assert.equal(dashboard.body.rows.find((row: { student: { id: string } }) => row.student.id === 'bruno').scores['st-novo'], null);
    assert.equal(typeof dashboard.body.kpis.attention, 'number');
    assert.equal((await request('/dashboard/heatmap?classId=c2&subjectId=mat&periodId=b3')).status, 404);
    const insight = await request('/dashboard/subtopics/st-cossenos/insight' + query);
    assert.equal(insight.status, 200);
    assert.equal(insight.body.subtopic.id, 'st-cossenos');
    assert.equal(insight.body.counts.length, 7);
    assert.equal((await request('/dashboard/subtopics/st-plano/insight' + query)).status, 404);
  });
});

describe('alunos e perfis', () => {
  it('entrega StudentSummary, StudentDetail e PedagogicalProfile', async () => {
    const list = await request('/students?subjectId=mat');
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 4);
    assert.ok(list.body.every((row: { student: { classId: string } }) => row.student.classId === 'c1'));
    const detail = await request('/students/ana?subjectId=mat');
    assert.equal(detail.status, 200);
    assert.equal(detail.body.student.id, 'ana');
    assert.ok(Array.isArray(detail.body.evolution));
    const profile = await request('/students/ana/profile?subjectId=mat');
    assert.equal(profile.status, 200);
    assert.equal(profile.body.studentId, 'ana');
    assert.ok(Array.isArray(profile.body.gaps));
    assert.equal((await request('/students/edu?subjectId=mat')).status, 404);
    assert.equal((await request('/students/ana/profile')).status, 400);
  });
});

describe('criação de provas e geração de adaptações', () => {
  it('aceita questões do frontend, questões manuais e questionIds do planejamento', async () => {
    const group = await request('/classes/c1/groups', { method: 'POST', body: { name: 'Bimestre HTTP' } });
    assert.equal(group.status, 201);
    const result = await request('/exams', { method: 'POST', body: {
      ...examInput, groupId: group.body.id,
      questions: [{ id: 'q1', key: 'q1', statement: 'Metadado do frontend', points: 2, source: 'banco' }, { statement: 'Questão manual', subtopicId: 'st-senos', points: 0.5, key: 'manual-1' }],
    } });
    assert.equal(result.status, 201);
    assert.equal(result.body.questionIds.length, 2);
    assert.equal(result.body.groupName, 'Bimestre HTTP');
    const examId = result.body.id;
    const detail = await request('/exams/' + examId);
    assert.equal(detail.body.exam.id, examId);
    assert.equal(detail.body.questions[1].source, 'manual');
    assert.equal(detail.body.questions[1].points, 0.5);
    assert.equal((await request(`/exams?classId=c1&groupId=${group.body.id}`)).body.length, 1);
    const { questions: _, ...fields } = examInput;
    assert.equal((await request('/exams', { method: 'POST', body: { ...fields, questionIds: ['q1'] } })).status, 201);
    assert.equal((await request('/exams', { method: 'POST', body: { ...examInput, date: '2026-02-30' } })).status, 400);
    assert.equal((await request('/exams', { method: 'POST', body: { ...examInput, classId: 'c2' } })).status, 404);
    assert.equal((await request('/exams', { method: 'POST', body: { ...examInput, teacherId: 't2' } })).status, 400);
    assert.equal((await request('/exams/' + examId, { teacher: 't2' })).status, 404);
  });

  it('gera versões combinadas e retorna studentNames como objeto JSON', async () => {
    const exam = (await request('/exams', { method: 'POST', body: examInput })).body;
    const path = '/exams/' + exam.id;
    assert.equal((await request(path + '/need-counts')).body.dislexia, 1);
    const generated = await request(path + '/adapt', { method: 'POST', body: { needs: ['dislexia', 'tdah'] } });
    assert.equal(generated.status, 200);
    assert.ok(generated.body.some((version: { needs: string[] }) => version.needs.length === 2));
    const result = await request(path + '/adaptations');
    assert.equal(result.body.studentNames.ana, 'Ana Moreira');
    assert.ok(result.body.adaptations.length > 0);
    assert.equal((await request(path + '/adapt', { method: 'POST', body: { needs: ['unknown'] } })).status, 400);
  });
});

describe('diagnósticos e registro de folhas', () => {
  it('avança a geração até a revisão e preserva o contrato do detalhe', async () => {
    assert.equal((await request('/diagnostics/suggestions?classId=c1&subjectId=mat')).status, 200);
    const created = await request('/diagnostics', { method: 'POST', body: { classId: 'c1', subtopicIds: ['st-cossenos'] } });
    assert.equal(created.status, 201);
    const path = '/diagnostics/' + created.body.id;
    assert.equal((await request(path + '/run-agent', { method: 'POST', body: { stage: 'criador' } })).status, 409);
    let diagnostic = created.body;
    for (let step = 0; step < 3 && diagnostic.stage !== 'revisao'; step++) {
      const result = await request(path + '/run-agent', { method: 'POST', body: { stage: diagnostic.stage } });
      assert.equal(result.status, 200);
      diagnostic = result.body;
    }
    assert.equal(diagnostic.stage, 'revisao');
    const detail = await request(path);
    assert.equal(detail.body.students.ana.id, 'ana');
    assert.ok(diagnostic.perStudent.length > 0);
    assert.equal((await request(path + '/run-agent', { method: 'POST' })).status, 409);
    assert.equal((await request(path, { teacher: 't2' })).status, 404);
  });

  it('registra metadados, recebe o conteúdo do arquivo e guarda as folhas', async () => {
    const exam = (await request('/exams', { method: 'POST', body: examInput })).body;
    const batch = await request('/uploads/batch', { method: 'POST', body: { examId: exam.id, files: [{ name: 'respostas.pdf', size: 1024, kind: 'respostas' }] } });
    assert.equal(batch.status, 201);
    assert.equal(batch.body.files[0].progress, 0);
    const content = (fileId: string, body: BodyInit, teacher = 't1') =>
      fetch(`${bases[teacher]}/uploads/batch/${batch.body.id}/files/${fileId}/content`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body });
    assert.equal((await content(batch.body.files[0].id, 'bytes do pdf')).status, 204);
    assert.equal((await content('missing', 'x')).status, 404);
    assert.equal((await content(batch.body.files[0].id, 'x', 't2')).status, 404);
    assert.equal((await content(batch.body.files[0].id, '')).status, 400);
    const path = '/uploads/batch/' + batch.body.id;
    const sheets = [{ studentId: 'ana', readStatus: 'completa' }, { studentId: 'bruno', readStatus: 'parcial', partialReason: 'Questão ilegível' }];
    assert.equal((await request(path + '/sheets', { method: 'POST', body: { sheets } })).status, 204);
    assert.equal((await request(path + '/sheets', { method: 'POST', teacher: 't2', body: { sheets } })).status, 404);
    assert.equal((await request('/uploads/batch', { method: 'POST', body: { examId: exam.id, files: [] } })).status, 400);
    assert.equal((await request('/uploads/batch', { method: 'POST', body: { diagnosticId: 'd1', files: [{ name: 'f.pdf', size: 1, kind: 'prova' }] } })).status, 404);
  });
});

describe('atividade, busca e notificações', () => {
  it('filtra as consultas sem modificar notificações', async () => {
    const unread = await request('/notifications?unreadOnly=true');
    assert.equal(unread.status, 200);
    assert.ok(unread.body.length > 0);
    assert.equal((await request('/notifications?unreadOnly=false')).status, 200);
    assert.equal((await request('/notifications?unreadOnly=1')).status, 400);
    assert.equal((await request('/agent-runs?agent=adaptacao')).status, 200);
    assert.equal((await request('/agent-runs?agent=unknown')).status, 400);
    const results = await request('/search?q=Ana');
    assert.ok(results.body.some((row: { id: string }) => row.id === 'ana'));
    assert.ok(!(await request('/search?q=Edu')).body.some((row: { id: string }) => row.id === 'edu'));
  });

  it('atualiza preferências sem aceitar valores fora do enum', async () => {
    const saved = await request('/teachers/me/preferences', { method: 'PUT', teacher: 't2', body: { theme: 'escuro', sidebarCollapsed: true } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.theme, 'escuro');
    assert.equal((await request('/teachers/me', { teacher: 't2' })).body.preferences.sidebarCollapsed, true);
    assert.equal((await request('/teachers/me', { teacher: 't1' })).body.preferences.theme, 'claro');
    assert.equal((await request('/teachers/me/preferences', { method: 'PUT', body: { theme: 'azul' } })).status, 400);
  });

  it('move a prova e percorre revisão de adaptações', async () => {
    const exam = (await request('/exams', { method: 'POST', body: examInput })).body;
    const group = (await request('/classes/c1/groups', { method: 'POST', body: { name: 'Pasta HTTP' } })).body;
    assert.equal((await request(`/exams/${exam.id}/group`, { method: 'PATCH', body: { groupId: group.id } })).status, 204);
    assert.equal((await request(`/exams/${exam.id}`)).body.exam.groupId, group.id);
    assert.equal((await request(`/exams/${exam.id}/group`, { method: 'PATCH', body: { groupId: 'outra' } })).status, 400);

    await request(`/exams/${exam.id}/adapt`, { method: 'POST', body: { needs: ['tdah'] } });
    const [first, ...rest] = (await request(`/exams/${exam.id}/adaptations`)).body.adaptations;
    assert.equal((await request(`/exams/${exam.id}/adaptations/finish`, { method: 'POST' })).status, 409);
    assert.equal((await request('/adaptations/' + first.id, { method: 'PATCH', body: { adapted: 'Texto editado' } })).status, 204);
    assert.equal((await request('/adaptations/' + first.id, { method: 'PATCH', body: { decision: 'talvez' } })).status, 400);
    assert.equal((await request('/adaptations/' + first.id, { method: 'PATCH', teacher: 't2', body: { decision: 'aceita' } })).status, 404);
    for (const a of rest) await request('/adaptations/' + a.id, { method: 'PATCH', body: { decision: 'rejeitada' } });
    assert.equal((await request(`/exams/${exam.id}/adaptations/finish`, { method: 'POST' })).status, 204);
    assert.equal((await request(`/exams/${exam.id}`)).body.exam.status, 'pronta');
  });

  it('revisa o perfil pelo estado pedido', async () => {
    const path = '/students/ana/profile';
    const review = (body: unknown) => request(path + '/review?subjectId=mat', { method: 'PATCH', body });
    assert.equal((await review({ reviewStatus: 'aprovado' })).status, 204);
    assert.equal((await request(path + '?subjectId=mat')).body.review, 'aprovado');
    assert.equal((await review({ reviewStatus: 'editado', summary: 'Novo resumo' })).status, 204);
    assert.equal((await request(path + '?subjectId=mat')).body.summary, 'Novo resumo');
    assert.equal((await review({ reviewStatus: 'rascunho' })).status, 204);
    assert.equal((await review({ reviewStatus: 'editado' })).status, 400);
    assert.equal((await review({ reviewStatus: 'outro' })).status, 400);
  });

  it('aprova, publica e devolve o diagnóstico', async () => {
    const d = (await request('/diagnostics', { method: 'POST', body: { classId: 'c1', subtopicIds: ['st-cossenos'] } })).body;
    let current = d;
    while (current.stage !== 'revisao') current = (await request(`/diagnostics/${d.id}/run-agent`, { method: 'POST' })).body;
    assert.equal((await request(`/diagnostics/${d.id}/publish`, { method: 'POST' })).status, 409);
    assert.equal((await request(`/diagnostics/${d.id}/students/${current.perStudent[0].studentId}/approve`, { method: 'PATCH', body: { approved: true } })).status, 204);
    assert.equal((await request(`/diagnostics/${d.id}/approve-all`, { method: 'POST' })).status, 204);
    assert.equal((await request(`/diagnostics/${d.id}/publish`, { method: 'POST' })).status, 204);
    assert.equal((await request(`/diagnostics/${d.id}/answers`, { method: 'POST' })).status, 204);
    assert.equal((await request(`/diagnostics/${d.id}`)).body.diagnostic.stage, 'concluida');
  });

  it('processa o lote com o agente simulado e marca notificações', async () => {
    const exam = (await request('/exams', { method: 'POST', body: examInput })).body;
    const batch = (await request('/uploads/batch', { method: 'POST', body: { examId: exam.id, files: [{ name: 'a.pdf', size: 1, kind: 'respostas' }] } })).body;
    const processed = await request(`/uploads/batch/${batch.id}/process`, { method: 'POST' });
    assert.equal(processed.status, 200);
    assert.equal(processed.body.sheets, 4);
    assert.equal((await request(`/uploads/batch/${batch.id}/process`, { method: 'POST' })).status, 409);
    assert.equal((await request(`/exams/${exam.id}`)).body.exam.status, 'corrigida');

    const [first] = (await request('/notifications?unreadOnly=true')).body;
    assert.equal((await request(`/notifications/${first.id}/read`, { method: 'PATCH' })).status, 204);
    assert.equal((await request('/notifications/missing/read', { method: 'PATCH' })).status, 404);
    assert.equal((await request('/notifications/read', { method: 'PATCH' })).status, 204);
    assert.equal((await request('/notifications?unreadOnly=true')).body.length, 0);
  });

  it('expõe turmas, alunos e recusas respeitando o professor', async () => {
    const body = { name: 'HTTP', level: 'Médio', school: 'Colégio', year: 2026, subjectIds: ['mat'] };
    const created = await request('/classes', { method: 'POST', body });
    assert.equal(created.status, 201);
    assert.equal((await request('/classes', { method: 'POST', body: { ...body, name: '' } })).status, 400);
    assert.equal((await request('/classes', { method: 'POST', body: { ...body, subjectIds: [] } })).status, 400);
    const path = '/classes/' + created.body.id;
    assert.equal((await request(path, { method: 'PUT', teacher: 't2', body })).status, 404);
    assert.equal((await request(path, { method: 'PUT', body: { ...body, name: 'Outro' } })).body.name, 'Outro');

    const student = await request('/students', { method: 'POST', body: { name: 'Novo', classId: created.body.id, declaredNeeds: ['tdah'] } });
    assert.equal(student.status, 201);
    assert.equal((await request('/students', { method: 'POST', body: { name: 'Novo', classId: created.body.id, declaredNeeds: ['inventada'] } })).status, 400);
    assert.equal((await request('/students', { method: 'POST', teacher: 't2', body: { name: 'Novo', classId: created.body.id, declaredNeeds: [] } })).status, 404);
    const studentPath = '/students/' + student.body.id;
    assert.deepEqual((await request(studentPath, { method: 'PUT', body: { name: 'Novo', classId: created.body.id, declaredNeeds: [] } })).body.declaredNeeds, []);
    assert.equal((await request(studentPath, { method: 'DELETE', teacher: 't2' })).status, 404);
    assert.equal((await request(studentPath, { method: 'DELETE' })).status, 204);

    assert.equal((await request(path, { method: 'DELETE', teacher: 't2' })).status, 404);
    assert.equal((await request(path, { method: 'DELETE' })).status, 204);
    assert.equal((await request(path)).status, 404);

    const d = (await request('/diagnostics', { method: 'POST', body: { classId: 'c1', subtopicIds: ['st-cossenos'] } })).body;
    assert.equal((await request('/diagnostics/' + d.id, { method: 'DELETE' })).status, 409);
  });
});
