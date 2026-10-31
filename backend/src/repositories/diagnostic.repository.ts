import { and, asc, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, diagnosticItems, diagnostics, diagnosticStudents, diagnosticSteps, diagnosticSubtopics } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Diagnostic, DiagnosticForStudent, DiagnosticItem, DiagnosticStage, DiagnosticStep, DiagnosticStepId } from '../types/domain';

const selectDiagnostics = (where: SQL | undefined) =>
  db.select({
    id: diagnostics.id, title: diagnostics.title, classId: diagnostics.classId, subjectId: diagnostics.subjectId,
    createdAt: diagnostics.createdAt, stage: diagnostics.stage, published: diagnostics.published,
  }).from(diagnostics).innerJoin(classes, eq(classes.id, diagnostics.classId)).where(where).orderBy(desc(diagnostics.createdAt)).all();

function loadSubtopicIds(ids: string[]) {
  const rows = db.select().from(diagnosticSubtopics).where(inArray(diagnosticSubtopics.diagnosticId, ids)).orderBy(asc(diagnosticSubtopics.position)).all();
  return groupBy(rows, (r) => r.diagnosticId, (r) => r.subtopicId);
}

function loadSteps(ids: string[]) {
  const rows = db.select().from(diagnosticSteps).where(inArray(diagnosticSteps.diagnosticId, ids)).orderBy(asc(diagnosticSteps.position)).all();
  return groupBy(rows, (r) => r.diagnosticId, (r): DiagnosticStep => ({ id: r.id, title: r.title, description: r.description, status: r.status, result: r.result ?? undefined }));
}

const studentKey = (row: { diagnosticId: string; studentId: string }) => `${row.diagnosticId}:${row.studentId}`;

function loadItems(ids: string[]) {
  const rows = db.select().from(diagnosticItems).where(inArray(diagnosticItems.diagnosticId, ids)).orderBy(asc(diagnosticItems.position)).all();
  return groupBy(rows, studentKey, (r): DiagnosticItem => ({
    id: r.id, subtopicId: r.subtopicId, statement: r.statement, adaptedFor: r.adaptedFor ?? undefined,
    alternatives: r.alternatives, answerKey: r.answerKey ?? undefined, solution: r.solution ?? undefined,
    difficulty: r.difficulty ?? undefined, checkResult: r.checkResult, prerequisite: r.prerequisite ?? undefined,
  }));
}

function loadPerStudent(ids: string[]) {
  const rows = db.select().from(diagnosticStudents).where(inArray(diagnosticStudents.diagnosticId, ids)).orderBy(asc(diagnosticStudents.position)).all();
  const items = loadItems(ids);
  return groupBy(rows, (r) => r.diagnosticId, (r): DiagnosticForStudent => ({ studentId: r.studentId, focus: r.focus, approved: r.approved, items: items.get(studentKey(r)) ?? [] }));
}

function query(where: SQL | undefined): Diagnostic[] {
  const rows = selectDiagnostics(where);
  const ids = rows.map((r) => r.id);
  const subtopicIds = loadSubtopicIds(ids);
  const steps = loadSteps(ids);
  const perStudent = loadPerStudent(ids);
  return rows.map((r) => ({ ...r, subtopicIds: subtopicIds.get(r.id) ?? [], steps: steps.get(r.id) ?? [], perStudent: perStudent.get(r.id) ?? [] }));
}

export const listByTeacher = (teacherId: string) => query(eq(classes.teacherId, teacherId));
export const findOwned = (teacherId: string, id: string): Diagnostic | undefined =>
  query(and(eq(classes.teacherId, teacherId), eq(diagnostics.id, id)))[0];

export function insert(diagnostic: Pick<Diagnostic, 'id' | 'title' | 'classId' | 'subjectId' | 'createdAt' | 'subtopicIds' | 'steps'>) {
  const { subtopicIds, steps, ...row } = diagnostic;
  const diagnosticId = row.id;
  db.insert(diagnostics).values(row).run();
  db.insert(diagnosticSubtopics).values(subtopicIds.map((subtopicId, position) => ({ diagnosticId, subtopicId, subjectId: row.subjectId, position }))).run();
  db.insert(diagnosticSteps).values(steps.map((s, position) => ({ ...s, diagnosticId, position }))).run();
}

export const setStage = (id: string, stage: DiagnosticStage) =>
  db.update(diagnostics).set({ stage }).where(eq(diagnostics.id, id)).run();

export const markPublished = (id: string) =>
  db.update(diagnostics).set({ published: true }).where(eq(diagnostics.id, id)).run();

export const updateStep = (diagnosticId: string, stepId: DiagnosticStepId, patch: Partial<Pick<DiagnosticStep, 'status' | 'result'>>) =>
  db.update(diagnosticSteps).set(patch).where(and(eq(diagnosticSteps.diagnosticId, diagnosticId), eq(diagnosticSteps.id, stepId))).run();

function insertStudent(diagnosticId: string, plan: DiagnosticForStudent, position: number) {
  const { studentId, focus, approved, items } = plan;
  db.insert(diagnosticStudents).values({ diagnosticId, studentId, focus, approved, position }).run();
  if (items.length) db.insert(diagnosticItems).values(items.map((item, i) => ({ ...item, diagnosticId, studentId, position: i }))).run();
}

export const insertStudents = (diagnosticId: string, plans: DiagnosticForStudent[]) =>
  plans.forEach((plan, position) => insertStudent(diagnosticId, plan, position));

export function replaceStudentItems(diagnosticId: string, studentId: string, items: DiagnosticItem[]) {
  db.delete(diagnosticItems).where(and(eq(diagnosticItems.diagnosticId, diagnosticId), eq(diagnosticItems.studentId, studentId))).run();
  if (items.length) db.insert(diagnosticItems).values(items.map((item, position) => ({ ...item, diagnosticId, studentId, position }))).run();
  setApproved(diagnosticId, studentId, false);
}

export const setApproved = (diagnosticId: string, studentId: string, approved: boolean) =>
  db.update(diagnosticStudents).set({ approved }).where(and(eq(diagnosticStudents.diagnosticId, diagnosticId), eq(diagnosticStudents.studentId, studentId))).run();

export const approveAll = (diagnosticId: string) =>
  db.update(diagnosticStudents).set({ approved: true }).where(eq(diagnosticStudents.diagnosticId, diagnosticId)).run();
