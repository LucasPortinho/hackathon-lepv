import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { needIds, needs, periods, subjects, subtopics } from '../db/schema';
import type { Need, Period, Subject, Subtopic } from '../types/domain';

const subtopicColumns = { id: subtopics.id, subjectId: subtopics.subjectId, name: subtopics.name, short: subtopics.short };

export const listSubjects = (): Subject[] => db.select().from(subjects).orderBy(asc(subjects.name)).all();
export const findSubjectById = (id: string): Subject | undefined => db.select().from(subjects).where(eq(subjects.id, id)).get();

export const listSubtopics = (subjectId: string): Subtopic[] =>
  db.select(subtopicColumns).from(subtopics).where(eq(subtopics.subjectId, subjectId)).orderBy(asc(subtopics.position)).all();

export const findSubtopicsByIds = (ids: string[]): Subtopic[] =>
  db.select(subtopicColumns).from(subtopics).where(inArray(subtopics.id, ids)).all();

/** Do período mais antigo para o mais recente. */
export const listPeriods = (): Period[] =>
  db.select({ id: periods.id, name: periods.name }).from(periods).orderBy(asc(periods.position)).all();

export const listNeeds = (): Need[] =>
  db.select().from(needs).all().sort((a, b) => needIds.indexOf(a.id) - needIds.indexOf(b.id));
