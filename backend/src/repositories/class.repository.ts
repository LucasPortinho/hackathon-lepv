import { and, asc, eq, getTableColumns, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, classStudentCounts, classSubjects, diagnostics, exams } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Class } from '../types/domain';

function selectClasses(where: SQL | undefined) {
  const { teacherId: _, ...columns } = getTableColumns(classes);
  return db.select({ ...columns, studentCount: classStudentCounts.studentCount }).from(classes)
    .innerJoin(classStudentCounts, eq(classStudentCounts.classId, classes.id))
    .where(where).orderBy(asc(classes.name)).all();
}

function attachSubjects(rows: Omit<Class, 'subjectIds'>[]): Class[] {
  const links = db.select().from(classSubjects).where(inArray(classSubjects.classId, rows.map((r) => r.id))).orderBy(asc(classSubjects.subjectId)).all();
  const subjectIds = groupBy(links, (l) => l.classId, (l) => l.subjectId);
  return rows.map((r) => ({ ...r, subjectIds: subjectIds.get(r.id) ?? [] }));
}

const query = (where: SQL | undefined) => attachSubjects(selectClasses(where));

export const listByTeacher = (teacherId: string) => query(eq(classes.teacherId, teacherId));

export const findOwned = (teacherId: string, classId: string): Class | undefined =>
  query(and(eq(classes.teacherId, teacherId), eq(classes.id, classId)))[0];

export type ClassFields = Pick<Class, 'name' | 'level' | 'school' | 'year'> & { grade?: number | null };

export function insert(teacherId: string, id: string, fields: ClassFields, subjectIds: string[]) {
  db.insert(classes).values({ ...fields, id, teacherId }).run();
  db.insert(classSubjects).values(subjectIds.map((subjectId) => ({ classId: id, subjectId }))).run();
}

export const update = (id: string, fields: ClassFields) =>
  db.update(classes).set(fields).where(eq(classes.id, id)).run();

export function replaceSubjects(classId: string, subjectIds: string[]) {
  db.delete(classSubjects).where(eq(classSubjects.classId, classId)).run();
  db.insert(classSubjects).values(subjectIds.map((subjectId) => ({ classId, subjectId }))).run();
}

/** Disciplinas que provas ou diagnósticos da turma usam: não podem sair dela. */
export function listUsedSubjects(classId: string) {
  const used = [
    ...db.select({ id: exams.subjectId }).from(exams).where(eq(exams.classId, classId)).all(),
    ...db.select({ id: diagnostics.subjectId }).from(diagnostics).where(eq(diagnostics.classId, classId)).all(),
  ];
  return new Set(used.map((row) => row.id));
}

export const remove = (id: string) => db.delete(classes).where(eq(classes.id, id)).run();
