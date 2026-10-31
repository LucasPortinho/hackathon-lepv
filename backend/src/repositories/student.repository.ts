import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { classes, studentNeeds, students } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Student } from '../types/domain';

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
