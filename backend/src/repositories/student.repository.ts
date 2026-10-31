import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, competencyGaps, diagnosticAnswerSheets, diagnosticItems, diagnosticStudents, examAnswerSheets, examVersionStudents, studentNeeds, studentPedagogicalProfiles, students } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { NeedId, Student } from '../types/domain';

function attachNeeds(rows: Omit<Student, 'declaredNeeds'>[]): Student[] {
  const declared = db.select().from(studentNeeds).where(inArray(studentNeeds.studentId, rows.map((r) => r.id))).orderBy(asc(studentNeeds.position)).all();
  const needs = groupBy(declared, (d) => d.studentId, (d) => d.needId);
  return rows.map((r) => ({ ...r, declaredNeeds: needs.get(r.id) ?? [] }));
}

const selectWithClass = (where: SQL | undefined) =>
  db.select({ id: students.id, name: students.name, classId: students.classId }).from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(where).orderBy(asc(students.name)).all();

export const listByClass = (classId: string) => attachNeeds(selectWithClass(eq(students.classId, classId)));

export const listByTeacher = (teacherId: string) => attachNeeds(selectWithClass(eq(classes.teacherId, teacherId)));

export const findOwned = (teacherId: string, studentId: string): Student | undefined =>
  attachNeeds(selectWithClass(and(eq(classes.teacherId, teacherId), eq(students.id, studentId))))[0];

export const insert = (student: Omit<Student, 'declaredNeeds'>) => db.insert(students).values(student).run();

export const update = (id: string, fields: { name: string; classId: string }) =>
  db.update(students).set(fields).where(eq(students.id, id)).run();

/** Lacunas e itens que citam a necessidade removida deixam de citá-la: nada menciona o que não é declarado. */
function clearNeedReferences(studentId: string, removed: NeedId[]) {
  db.update(competencyGaps).set({ readingKind: 'tecnica', needId: null })
    .where(and(eq(competencyGaps.studentId, studentId), inArray(competencyGaps.needId, removed))).run();
  db.update(diagnosticItems).set({ adaptedFor: null })
    .where(and(eq(diagnosticItems.studentId, studentId), inArray(diagnosticItems.adaptedFor, removed))).run();
  db.delete(studentNeeds).where(and(eq(studentNeeds.studentId, studentId), inArray(studentNeeds.needId, removed))).run();
}

export function replaceNeeds(studentId: string, current: NeedId[], needs: NeedId[]) {
  clearNeedReferences(studentId, current.filter((n) => !needs.includes(n)));
  needs.forEach((needId, position) => db.insert(studentNeeds).values({ studentId, needId, position })
    .onConflictDoUpdate({ target: [studentNeeds.studentId, studentNeeds.needId], set: { position } }).run());
}

/** Provas e diagnósticos exigem aluno da mesma turma: quem tem esses vínculos não pode trocar de turma. */
export function hasClassRecords(studentId: string) {
  const inExam = db.select({ id: examVersionStudents.studentId }).from(examVersionStudents).where(eq(examVersionStudents.studentId, studentId)).get();
  const inDiagnostic = db.select({ id: diagnosticStudents.studentId }).from(diagnosticStudents).where(eq(diagnosticStudents.studentId, studentId)).get();
  return Boolean(inExam ?? inDiagnostic);
}

/** Apaga na ordem que as chaves RESTRICT exigem; as demais dependências saem por CASCADE. */
export function remove(id: string) {
  db.delete(examAnswerSheets).where(eq(examAnswerSheets.studentId, id)).run();
  db.delete(diagnosticAnswerSheets).where(eq(diagnosticAnswerSheets.studentId, id)).run();
  db.delete(diagnosticStudents).where(eq(diagnosticStudents.studentId, id)).run();
  db.delete(studentPedagogicalProfiles).where(eq(studentPedagogicalProfiles.studentId, id)).run();
  db.delete(students).where(eq(students.id, id)).run();
}
