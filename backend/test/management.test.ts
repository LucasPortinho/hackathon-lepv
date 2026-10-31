import './env';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { DEMO_TEACHER_ID as T } from '../src/db/seed/data/catalog';
import { ensureDemoDatabase } from '../src/db/seed';
import * as adaptations from '../src/services/adaptations/adaptation.service';
import * as classes from '../src/services/classes/class.service';
import { getDashboard } from '../src/services/dashboard/dashboard.service';
import { advanceDiagnostic } from '../src/services/diagnostics/diagnostic-agent.service';
import { saveCreatorItems } from '../src/services/diagnostics/diagnostic-creator.service';
import { approveAll, publishDiagnostic, rejectDiagnostic, rejectForStudent } from '../src/services/diagnostics/diagnostic-review.service';
import * as diagnostics from '../src/services/diagnostics/diagnostic.service';
import * as exams from '../src/services/exams/exam.service';
import { getStudentDetail, listStudents } from '../src/services/profiles/profile.service';
import { ConflictError, NotFoundError, ValidationError } from '../src/services/shared/errors';
import { requireClass } from '../src/services/shared/guards';
import * as students from '../src/services/students/student.service';
import { createBatch, processBatch } from '../src/services/uploads/upload.service';

const count = (table: typeof schema.students) => db.select().from(table).all().length;
const newClass = { name: 'Nova turma', level: 'Médio', school: 'Colégio', year: 2026, subjectIds: ['mat'] };

async function inReview(classId: string, subtopics: string[]) {
  const d = diagnostics.createDiagnostic(T, classId, subtopics);
  let current = d;
  while (current.stage !== 'revisao') current = await advanceDiagnostic(T, d.id);
  return current;
}

before(() => ensureDemoDatabase());

describe('turmas', () => {
  it('cria, edita e aceita turma sem alunos', () => {
    const created = classes.createClass(T, newClass);
    assert.equal(created.studentCount, 0);
    assert.deepEqual(created.subjectIds, ['mat']);
    const edited = classes.updateClass(T, created.id, { ...newClass, name: 'Renomeada', year: 2027, subjectIds: ['mat', 'fis'] });
    assert.equal(edited.name, 'Renomeada');
    assert.deepEqual(edited.subjectIds, ['fis', 'mat']);
    classes.deleteClass(T, created.id);
    assert.throws(() => requireClass(T, created.id), NotFoundError);
  });

  it('valida disciplinas e protege as que estão em uso', () => {
    assert.throws(() => classes.createClass(T, { ...newClass, subjectIds: [] }), ValidationError);
    assert.throws(() => classes.createClass(T, { ...newClass, subjectIds: ['quimica'] }), ValidationError);
    assert.throws(() => classes.updateClass(T, 'c-2a', { ...newClass, subjectIds: ['fis'] }), ConflictError);
  });

  it('exclui uma turma com tudo que depende dela, sem tocar nas outras', async () => {
    const before = { students: count(schema.students), other: listStudents(T, 'mat').filter((s) => s.student.classId !== 'c-2b').length };
    const exam = exams.createExam(T, { title: 'Prova', classId: 'c-2b', subjectId: 'mat', groupId: 'g-b1', date: '2026-11-12', questions: [{ id: 'q1' }] });
    await adaptations.generateAdaptations(T, exam.id, ['dislexia']);
    const batch = createBatch(T, 'e-leis', [{ name: 'a.pdf', size: 1, kind: 'gabarito' }]);
    await processBatch(T, batch.id);
    const published = await inReview('c-2b', ['st-senos']);
    approveAll(T, published.id);
    publishDiagnostic(T, published.id);

    classes.deleteClass(T, 'c-2b');

    assert.throws(() => requireClass(T, 'c-2b'), NotFoundError);
    assert.equal(count(schema.students), before.students - 34);
    assert.equal(listStudents(T, 'mat').length, before.other);
    assert.ok(exams.listExams(T).every((e) => e.classId !== 'c-2b'));
    assert.ok(diagnostics.listDiagnostics(T).every((d) => d.classId !== 'c-2b'));
    assert.deepEqual(db.$client.pragma('foreign_key_check'), []);
    assert.ok(exams.listExams(T).some((e) => e.classId === 'c-2a'));
  });
});

describe('alunos', () => {
  it('cria aluno sem notas sem fingir domínio do conteúdo', () => {
    const student = students.createStudent(T, { name: 'Zeca Nunes', classId: 'c-1c', declaredNeeds: ['tea'] });
    assert.deepEqual(student.declaredNeeds, ['tea']);
    assert.equal(requireClass(T, 'c-1c').studentCount, 1);
    const { profile } = getStudentDetail(T, student.id, 'mat');
    assert.match(profile.summary, /ainda não tem notas/);
    assert.equal(getDashboard(T, { classId: 'c-1c', subjectId: 'mat', periodId: 'b3' }).rows[0].average, null);
    students.deleteStudent(T, student.id);
    assert.equal(requireClass(T, 'c-1c').studentCount, 0);
  });

  it('impede trocar de turma quem tem provas, mas permite editar o resto', () => {
    const [student] = requireClassStudents('c-2a');
    assert.throws(() => students.updateStudent(T, student.id, { name: student.name, classId: 'c-3c', declaredNeeds: [] }), ConflictError);
    assert.equal(students.updateStudent(T, student.id, { name: 'Novo Nome', classId: 'c-2a', declaredNeeds: ['tdah'] }).name, 'Novo Nome');
  });

  it('move de turma quem não tem vínculos', () => {
    const student = students.createStudent(T, { name: 'Sem Vinculo', classId: 'c-1c', declaredNeeds: [] });
    assert.equal(students.updateStudent(T, student.id, { name: student.name, classId: 'c-3c', declaredNeeds: [] }).classId, 'c-3c');
    assert.throws(() => students.updateStudent(T, student.id, { name: student.name, classId: 'inexistente', declaredNeeds: [] }), NotFoundError);
  });

  it('remover uma necessidade limpa as leituras que a citavam', async () => {
    const taina = requireClassStudents('c-2a').find((s) => s.name === 'Tainá Rezende')!;
    db.update(schema.scores).set({ value: 30 }).run();
    const d = await inReview('c-2a', ['st-senos']);
    getStudentDetail(T, taina.id, 'mat');
    db.delete(schema.studentPedagogicalProfiles).run();
    const { profile } = getStudentDetail(T, taina.id, 'mat');
    assert.ok(profile.gaps.some((g) => g.reading.kind === 'necessidade'));
    const adapted = d.perStudent.find((p) => p.studentId === taina.id)!;
    assert.ok(adapted.items.some((i) => i.adaptedFor === 'dislexia'));

    students.updateStudent(T, taina.id, { name: taina.name, classId: 'c-2a', declaredNeeds: [] });

    assert.ok(getStudentDetail(T, taina.id, 'mat').profile.gaps.every((g) => g.reading.kind === 'tecnica'));
    const after = diagnostics.getDiagnostic(T, d.id).diagnostic.perStudent.find((p) => p.studentId === taina.id)!;
    assert.ok(after.items.every((i) => i.adaptedFor === undefined));
    rejectDiagnostic(T, d.id);
  });

  it('exclui aluno com folhas, diagnóstico e perfil', async () => {
    const d = await inReview('c-2a', ['st-senos']);
    approveAll(T, d.id);
    publishDiagnostic(T, d.id);
    const { studentId } = d.perStudent[0];
    students.deleteStudent(T, studentId);
    assert.throws(() => students.deleteStudent(T, studentId), NotFoundError);
    assert.ok(diagnostics.getDiagnostic(T, d.id).diagnostic.perStudent.every((p) => p.studentId !== studentId));
    assert.deepEqual(db.$client.pragma('foreign_key_check'), []);
  });
});

describe('recusa de avaliação diagnóstica', () => {
  it('tira um aluno, edita questão e recusa a avaliação inteira', async () => {
    const d = await inReview('c-3c', ['st-senos']);
    assert.ok(d.perStudent.length > 1);
    const [first, second] = d.perStudent;
    rejectForStudent(T, d.id, first.studentId);
    let current = diagnostics.getDiagnostic(T, d.id).diagnostic;
    assert.ok(current.perStudent.every((p) => p.studentId !== first.studentId));
    assert.throws(() => rejectForStudent(T, d.id, first.studentId), ValidationError);

    const edited = { ...second.items[0], statement: 'Enunciado do professor', checkResult: 'nao_verificavel' as const };
    assert.equal(saveCreatorItems(T, d.id, second.studentId, [edited]).items[0].statement, 'Enunciado do professor');

    for (const plan of current.perStudent.slice(1)) rejectForStudent(T, d.id, plan.studentId);
    current = diagnostics.getDiagnostic(T, d.id).diagnostic;
    assert.throws(() => rejectForStudent(T, d.id, current.perStudent[0].studentId), ConflictError);

    rejectDiagnostic(T, d.id);
    assert.throws(() => diagnostics.getDiagnostic(T, d.id), NotFoundError);
  });

  it('não recusa avaliação já publicada', async () => {
    const d = await inReview('c-3c', ['st-senos']);
    approveAll(T, d.id);
    publishDiagnostic(T, d.id);
    assert.throws(() => rejectDiagnostic(T, d.id), ConflictError);
    assert.throws(() => rejectForStudent(T, d.id, d.perStudent[0].studentId), ConflictError);
  });
});

function requireClassStudents(classId: string) {
  return listStudents(T, 'mat').filter((s) => s.student.classId === classId).map((s) => s.student);
}
