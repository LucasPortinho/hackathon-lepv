import './env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { createDatabase } from './setup';
import { transaction } from '../src/db';
import * as adaptations from '../src/services/adaptations/adaptation.service';
import { listRuns } from '../src/services/agent-runs/agent-run.service';
import * as classes from '../src/services/classes/class.service';
import * as dashboard from '../src/services/dashboard/dashboard.service';
import * as diagnosticAgent from '../src/services/diagnostics/diagnostic-agent.service';
import * as diagnosticResults from '../src/services/diagnostics/diagnostic-results.service';
import * as diagnosticReview from '../src/services/diagnostics/diagnostic-review.service';
import * as diagnostics from '../src/services/diagnostics/diagnostic.service';
import * as exams from '../src/services/exams/exam.service';
import * as notifications from '../src/services/notifications/notification.service';
import * as profileReview from '../src/services/profiles/profile-review.service';
import * as profiles from '../src/services/profiles/profile.service';
import { search } from '../src/services/search/search.service';
import { ConflictError, NotFoundError, ValidationError } from '../src/services/shared/errors';
import * as teachers from '../src/services/teachers/teacher.service';
import * as uploads from '../src/services/uploads/upload.service';

const T = 't1';
const newExam = { title: 'Prova', classId: 'c1', subjectId: 'mat', groupId: null, date: '2026-11-12', questions: [{ id: 'q1' }, { id: 'q2' }] };

before(createDatabase);

describe('catálogo', () => {
  it('lista turmas do professor com alunos e disciplinas', () => {
    assert.deepEqual(classes.listClasses(T), [{ id: 'c1', name: '2º ano B', level: 'Médio', school: 'Colégio', year: 2026, studentCount: 4, subjectIds: ['mat'] }]);
  });

  it('cria e atualiza preferências', () => {
    assert.equal(teachers.getPreferences(T).theme, 'claro');
    assert.equal(teachers.updatePreferences(T, { theme: 'escuro', sidebarCollapsed: true }).theme, 'escuro');
    assert.equal(teachers.getPreferences(T).sidebarCollapsed, true);
  });
});

describe('dashboard', () => {
  const q = { classId: 'c1', subjectId: 'mat', periodId: 'b3' };

  it('monta linhas e indicadores', () => {
    const d = dashboard.getDashboard(T, q);
    assert.equal(d.rows.length, 4);
    assert.equal(d.rows[0].average, 65);
    assert.equal(d.rows[0].scores['st-novo'], 65);
    assert.equal(d.rows[1].scores['st-novo'], null);
    assert.equal(d.kpis.attention, 1);
    assert.equal(d.pendingReviews, 4);
  });

  it('não expõe turma de outro professor', () => {
    assert.throws(() => dashboard.getDashboard(T, { ...q, classId: 'c2' }), NotFoundError);
  });

  it('calcula o insight do subtópico', () => {
    const i = dashboard.getSubtopicInsight(T, q, 'st-cossenos');
    assert.equal(i.average, 58);
    assert.deepEqual(i.counts, [0, 1, 0, 0, 1, 2, 0]);
    assert.deepEqual(i.struggling.map((s) => s.student.id), ['ana', 'bruno', 'dani']);
    assert.throws(() => dashboard.getSubtopicInsight(T, q, 'st-plano'), NotFoundError);
  });
});

describe('perfis', () => {
  it('cria o perfil na primeira consulta, respeitando a necessidade declarada', () => {
    const { profile, evolution, competencies } = profiles.getStudentDetail(T, 'ana', 'mat');
    assert.equal(profile.overall, 65);
    assert.equal(profile.delta, 5);
    assert.deepEqual(profile.gaps[0].reading, { kind: 'necessidade', needId: 'dislexia' });
    assert.deepEqual(profile.gaps[1].reading, { kind: 'tecnica' });
    assert.match(profile.gaps[1].competency, /Tópico sem nota fixa/);
    assert.equal(evolution.length, 2);
    assert.equal(competencies.length, 3);
  });

  it('segue o ciclo de revisão e preserva edições', () => {
    const gapId = 'ana-st-cossenos';
    profileReview.saveProfileEdit(T, 'ana', 'mat', 'Resumo novo', { [gapId]: 'Nota nova', outra: 'ignorada' });
    let { profile } = profiles.getStudentDetail(T, 'ana', 'mat');
    assert.equal(profile.review, 'editado');
    assert.equal(profile.summary, 'Resumo novo');
    assert.equal(profile.gaps.find((g) => g.id === gapId)?.note, 'Nota nova');

    profileReview.approveProfile(T, 'ana', 'mat');
    ({ profile } = profiles.getStudentDetail(T, 'ana', 'mat'));
    assert.equal(profile.review, 'aprovado');
    assert.ok(profile.reviewedAt);

    profileReview.reopenProfile(T, 'ana', 'mat');
    ({ profile } = profiles.getStudentDetail(T, 'ana', 'mat'));
    assert.equal(profile.review, 'rascunho');
    assert.equal(profile.reviewedAt, undefined);
  });

  it('lista alunos sem criar perfis', () => {
    const list = profiles.listStudents(T, 'mat');
    assert.equal(list.length, 4);
    assert.equal(list.find((s) => s.student.id === 'ana')?.review, 'rascunho');
    assert.equal(list.find((s) => s.student.id === 'carla')?.review, null);
    assert.equal(list.find((s) => s.student.id === 'carla')?.className, '2º ano B');
  });

  it('não expõe aluno de outro professor', () => {
    assert.throws(() => profileReview.approveProfile(T, 'edu', 'mat'), NotFoundError);
  });
});

describe('provas e adaptações', () => {
  it('valida a criação', () => {
    assert.throws(() => exams.createExam(T, { ...newExam, date: '2026-02-31' }), ValidationError);
    assert.throws(() => exams.createExam(T, { ...newExam, questions: [] }), ValidationError);
    assert.throws(() => exams.createExam(T, { ...newExam, questions: [{ id: 'q1' }, { id: 'q1' }] }), ValidationError);
    assert.throws(() => exams.createExam(T, { ...newExam, questions: [{ id: 'q3' }] }), ValidationError);
    assert.throws(() => exams.createExam(T, { ...newExam, subjectId: 'fis' }), ValidationError);
    assert.throws(() => exams.createExam(T, { ...newExam, classId: 'c2' }), NotFoundError);
  });

  it('cria com questão manual, pasta e ordem', () => {
    const group = exams.createGroup(T, 'c1', ' 3º bimestre ');
    const exam = exams.createExam(T, { ...newExam, groupId: group.id, questions: [{ statement: 'Manual.', subtopicId: 'st-senos', points: 1 }, { id: 'q1' }] });
    assert.equal(exam.status, 'rascunho');
    assert.equal(exam.groupName, '3º bimestre');
    assert.equal(exam.questionIds[1], 'q1');
    assert.equal(exams.getExam(T, exam.id).questions[0].source, 'manual');
    exams.moveExam(T, exam.id, null);
    assert.equal(exams.getExam(T, exam.id).exam.groupId, null);
    assert.throws(() => exams.getExam('t2', exam.id), NotFoundError);
  });

  it('percorre geração, revisão e conclusão', async () => {
    const exam = exams.createExam(T, newExam);
    assert.deepEqual(adaptations.getNeedCounts(T, exam.id), { dislexia: 1, tdah: 2 });

    const versions = await adaptations.generateAdaptations(T, exam.id, ['tdah', 'dislexia']);
    assert.deepEqual(versions.map((v) => v.id), ['v-tdah', 'v-dislexia', 'v-tdah+dislexia']);
    assert.deepEqual(versions[2].studentIds, ['ana']);

    await adaptations.generateAdaptations(T, exam.id, ['tdah', 'dislexia']);
    const data = adaptations.getAdaptations(T, exam.id);
    assert.equal(data.exam.status, 'em_adaptacao');
    assert.equal(data.studentNames.ana, 'Ana Moreira');
    const combined = data.adaptations.filter((a) => a.versionId === 'v-tdah+dislexia');
    assert.deepEqual(combined.find((a) => a.questionId === 'q1')?.needs, ['tdah', 'dislexia']);
    const authored = data.adaptations.filter((a) => a.questionId === 'q2');
    assert.ok(authored.every((a) => a.adapted === 'Calcule\no lado.'));

    assert.throws(() => adaptations.finishAdaptation(T, exam.id), ConflictError);
    const [first, ...rest] = data.adaptations;
    adaptations.editAdaptation(T, first.id, 'Editado');
    rest.forEach((a) => adaptations.decideAdaptation(T, a.id, 'rejeitada'));
    adaptations.decideAdaptation(T, rest[0].id, 'pendente');
    assert.throws(() => adaptations.finishAdaptation(T, exam.id), ConflictError);
    adaptations.decideAdaptation(T, rest[0].id, 'aceita');
    adaptations.finishAdaptation(T, exam.id);

    const done = exams.getExam(T, exam.id).exam;
    assert.equal(done.status, 'pronta');
    assert.deepEqual(done.versions[0], { id: 'v-original', label: 'Original', needs: [], studentIds: ['carla', 'dani'] });
    assert.equal(done.versions.length, 4);
    await assert.rejects(adaptations.generateAdaptations(T, exam.id, ['tdah']), ConflictError);
    assert.throws(() => adaptations.decideAdaptation(T, first.id, 'aceita'), ConflictError);
    assert.throws(() => adaptations.decideAdaptation('t2', first.id, 'aceita'), NotFoundError);

    assert.deepEqual(profiles.getStudentDetail(T, 'ana', 'mat').adaptations.map((a) => a.versionLabel), ['Combinada: TDAH + Dislexia']);
    assert.equal(listRuns(T).filter((r) => r.agent === 'adaptacao').length, 2);
    assert.equal(listRuns('t2').length, 0);
  });
});

describe('avaliações diagnósticas', () => {
  it('valida subtópicos', () => {
    assert.throws(() => diagnostics.createDiagnostic(T, 'c1', []), ValidationError);
    assert.throws(() => diagnostics.createDiagnostic(T, 'c1', ['st-senos', 'st-plano']), ValidationError);
    assert.throws(() => diagnostics.createDiagnostic(T, 'c1', ['st-plano']), ValidationError);
  });

  it('sugere primeiro os subtópicos de menor média', () => {
    assert.deepEqual(diagnostics.suggestSubtopics(T, 'c1', 'mat').map((s) => s.subtopic.id), ['st-cossenos', 'st-novo', 'st-senos']);
  });

  it('percorre o fluxo completo e devolve os perfis para revisão', async () => {
    profileReview.approveProfile(T, 'bruno', 'mat');
    const created = diagnostics.createDiagnostic(T, 'c1', ['st-cossenos']);
    assert.equal(created.title, 'Lei dos Cossenos');
    assert.equal(created.steps[0].status, 'executando');
    assert.throws(() => diagnosticReview.approveAll(T, created.id), ConflictError);

    const adapted = await diagnosticAgent.advanceDiagnostic(T, created.id);
    assert.equal(adapted.stage, 'criador');
    assert.deepEqual(adapted.perStudent.map((p) => p.studentId), ['ana', 'bruno', 'dani']);
    assert.equal(adapted.perStudent[0].items[0].adaptedFor, 'dislexia');
    assert.equal(adapted.perStudent[2].items[0].adaptedFor, undefined);

    assert.equal((await diagnosticAgent.advanceDiagnostic(T, created.id)).stage, 'adaptacao');
    assert.equal((await diagnosticAgent.advanceDiagnostic(T, created.id)).stage, 'revisao');
    await assert.rejects(diagnosticAgent.advanceDiagnostic(T, created.id), ConflictError);
    assert.throws(() => diagnosticReview.publishDiagnostic(T, created.id), ConflictError);
    assert.throws(() => diagnosticReview.approveForStudent(T, created.id, 'carla', true), ValidationError);

    diagnosticReview.approveForStudent(T, created.id, 'ana', true);
    diagnosticReview.approveAll(T, created.id);
    diagnosticReview.publishDiagnostic(T, created.id);

    const before = dashboard.getDashboard(T, { classId: 'c1', subjectId: 'mat', periodId: 'b3' }).rows.find((r) => r.student.id === 'bruno')!;
    diagnosticResults.receiveAnswers(T, created.id);
    const after = dashboard.getDashboard(T, { classId: 'c1', subjectId: 'mat', periodId: 'b3' }).rows.find((r) => r.student.id === 'bruno')!;
    assert.equal(after.scores['st-cossenos'], (before.scores['st-cossenos'] as number) + 7);

    const { diagnostic, className, students } = diagnostics.getDiagnostic(T, created.id);
    assert.equal(diagnostic.stage, 'concluida');
    assert.equal(diagnostic.published, true);
    assert.equal(className, '2º ano B');
    assert.equal(students.ana.name, 'Ana Moreira');
    assert.equal(profiles.getStudentDetail(T, 'bruno', 'mat').profile.review, 'rascunho');
    assert.throws(() => diagnosticResults.receiveAnswers(T, created.id), ConflictError);
    assert.ok(notifications.listNotifications(T).some((n) => n.title === 'Avaliação pronta para revisão'));
  });

  it('pula a adaptação quando o grupo não tem necessidades declaradas', async () => {
    const d = diagnostics.createDiagnostic(T, 'c1', ['st-senos']);
    const created = await diagnosticAgent.advanceDiagnostic(T, d.id);
    assert.equal(created.stage, 'criador');
    assert.deepEqual(created.perStudent.map((p) => p.studentId), ['dani']);
    const next = await diagnosticAgent.advanceDiagnostic(T, d.id);
    assert.equal(next.stage, 'revisao');
    assert.equal(next.steps.find((s) => s.id === 'adaptacao')?.status, 'ignorado');
  });
});

describe('envios', () => {
  it('rejeita prova em revisão de adaptações', async () => {
    const exam = exams.createExam(T, newExam);
    await adaptations.generateAdaptations(T, exam.id, ['tdah']);
    assert.throws(() => uploads.createBatch(T, exam.id, [{ name: 'a.pdf', size: 1, kind: 'gabarito' }]), ConflictError);
  });

  it('conta folhas reais, marca a prova como corrigida e refaz os perfis', () => {
    const exam = exams.createExam(T, newExam);
    const batch = uploads.createBatch(T, exam.id, [{ name: 'a.pdf', size: 10, kind: 'gabarito' }, { name: 'b.exe', size: 1, kind: 'prova' }]);
    assert.equal(batch.files[1].error, 'Formato não aceito. Use PDF, PNG ou JPG.');
    assert.throws(() => uploads.recordSheets(T, batch.id, [{ studentId: 'edu', readStatus: 'completa' }]), NotFoundError);

    profileReview.approveProfile(T, 'carla', 'mat');
    uploads.recordSheets(T, batch.id, [
      { studentId: 'carla', readStatus: 'completa' },
      { studentId: 'ana', readStatus: 'parcial', partialReason: 'Questão 3 ilegível' },
      { studentName: 'Ilegível', readStatus: 'parcial' },
    ]);
    assert.deepEqual(uploads.finishProcessing(T, batch.id), {
      sheets: 3,
      partial: [{ name: 'Ana Moreira', reason: 'Questão 3 ilegível' }, { name: 'Ilegível', reason: 'Leitura parcial' }],
      profiles: 2,
      subtopics: 2,
    });
    const done = exams.getExam(T, exam.id).exam;
    assert.equal(done.status, 'corrigida');
    assert.equal(done.partialReads, 2);
    assert.equal(profiles.getStudentDetail(T, 'carla', 'mat').profile.review, 'rascunho');
    assert.throws(() => uploads.finishProcessing(T, batch.id), ConflictError);
    assert.throws(() => uploads.finishProcessing('t2', batch.id), NotFoundError);

    const kpis = dashboard.getDashboard(T, { classId: 'c1', subjectId: 'mat', periodId: 'b3' }).kpis;
    assert.equal(kpis.examsProcessed, 1);
    assert.ok(kpis.adaptations > 0);
  });
});

describe('atividade', () => {
  it('marca notificações como lidas apenas para o dono', () => {
    const [first] = notifications.listNotifications(T);
    assert.throws(() => notifications.markRead('t2', first.id), NotFoundError);
    notifications.markRead(T, first.id);
    assert.equal(notifications.listNotifications(T).find((n) => n.id === first.id)?.read, true);
    notifications.markAllRead(T);
    assert.ok(notifications.listNotifications(T).every((n) => n.read));
  });

  it('busca sem distinguir acentos e só no que é do professor', () => {
    assert.ok(search(T, 'avaliacoes').some((r) => r.to === '/diagnosticas'));
    assert.deepEqual(search(T, 'moreira').map((r) => r.id), ['ana']);
    assert.deepEqual(search(T, 'edu lima'), []);
    assert.equal(search(T, '').length, 6);
  });
});

describe('transações', () => {
  it('desfaz tudo quando uma etapa falha', () => {
    const before = exams.listExams(T).length;
    assert.throws(() => transaction(() => {
      exams.createExam(T, newExam);
      throw new Error('falha');
    }), /falha/);
    assert.equal(exams.listExams(T).length, before);
  });
});
