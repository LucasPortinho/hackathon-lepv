import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { classes, scores, students } from '../db/schema';
import { nowIso } from '../lib/time';
import type { Score } from '../types/domain';

const columns = { studentId: scores.studentId, subtopicId: scores.subtopicId, periodId: scores.periodId, value: scores.value };

export const listByStudent = (studentId: string): Score[] =>
  db.select(columns).from(scores).where(eq(scores.studentId, studentId)).all();

export const listByClass = (classId: string): Score[] =>
  db.select(columns).from(scores).innerJoin(students, eq(students.id, scores.studentId)).where(eq(students.classId, classId)).all();

export const listByTeacher = (teacherId: string): Score[] =>
  db.select(columns).from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(classes.teacherId, teacherId)).all();

export const upsert = (score: Score & { value: number }) =>
  db.insert(scores).values({ ...score, updatedAt: nowIso() })
    .onConflictDoUpdate({ target: [scores.studentId, scores.subtopicId, scores.periodId], set: { value: score.value, updatedAt: nowIso() } }).run();

export const updateValue = (score: Score & { value: number }) =>
  db.update(scores).set({ value: score.value, updatedAt: nowIso() })
    .where(and(eq(scores.studentId, score.studentId), eq(scores.subtopicId, score.subtopicId), eq(scores.periodId, score.periodId))).run();
