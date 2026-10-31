import { and, asc, eq, getTableColumns, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, classStudentCounts, classSubjects } from '../db/schema';
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
