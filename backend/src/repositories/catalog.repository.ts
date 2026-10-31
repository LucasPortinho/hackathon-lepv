import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { needIds, needs, periods, subjects, subtopicPrerequisites, subtopics } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Need, Period, Subject, Subtopic } from '../types/domain';

const subtopicColumns = {
  id: subtopics.id, subjectId: subtopics.subjectId, name: subtopics.name, short: subtopics.short,
  unit: subtopics.unit, years: subtopics.years, description: subtopics.description, keywords: subtopics.keywords,
};

export const listSubjects = (): Subject[] => db.select().from(subjects).orderBy(asc(subjects.name)).all();
export const findSubjectById = (id: string): Subject | undefined => db.select().from(subjects).where(eq(subjects.id, id)).get();

export const listSubtopics = (subjectId: string): Subtopic[] =>
  db.select(subtopicColumns).from(subtopics).where(eq(subtopics.subjectId, subjectId)).orderBy(asc(subtopics.position)).all();

export const findSubtopicsByIds = (ids: string[]): Subtopic[] =>
  db.select(subtopicColumns).from(subtopics).where(inArray(subtopics.id, ids)).all();

/** Pré-requisitos diretos de cada subtópico, na ordem de estudo. */
export function listPrerequisites(ids: string[]) {
  const rows = db.select({ dependentId: subtopicPrerequisites.subtopicId, ...subtopicColumns }).from(subtopicPrerequisites)
    .innerJoin(subtopics, eq(subtopics.id, subtopicPrerequisites.prerequisiteId))
    .where(inArray(subtopicPrerequisites.subtopicId, ids)).orderBy(asc(subtopics.position)).all();
  return groupBy(rows, (r) => r.dependentId, ({ dependentId: _, ...subtopic }): Subtopic => subtopic);
}

/** Do período mais antigo para o mais recente. */
export const listPeriods = (): Period[] =>
  db.select({ id: periods.id, name: periods.name }).from(periods).orderBy(asc(periods.position)).all();

export const listNeeds = (): Need[] =>
  db.select().from(needs).all().sort((a, b) => needIds.indexOf(a.id) - needIds.indexOf(b.id));
