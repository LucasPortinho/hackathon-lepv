import { asc, eq, inArray, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { questionAuthoredAdaptations, questions } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Question } from '../types/domain';

type AuthoredRow = typeof questionAuthoredAdaptations.$inferSelect;

const toAuthored = (rows: AuthoredRow[] | undefined): Question['authored'] =>
  rows && Object.fromEntries(rows.map((a) => [a.needId, { text: a.text, why: a.why }]));

function query(where: SQL): Question[] {
  const rows = db.select().from(questions).where(where).orderBy(asc(questions.id)).all();
  const authored = db.select().from(questionAuthoredAdaptations).where(inArray(questionAuthoredAdaptations.questionId, rows.map((r) => r.id))).all();
  const byQuestion = groupBy(authored, (a) => a.questionId);
  return rows.map(({ figure, ...r }) => ({ ...r, figure: figure ?? undefined, authored: toAuthored(byQuestion.get(r.id)) }));
}

export const listBank = () => query(eq(questions.source, 'banco'));
export const findByIds = (ids: string[]) => query(inArray(questions.id, ids));
export const listBySubtopics = (subtopicIds: string[]) => query(inArray(questions.subtopicId, subtopicIds));

export const insertManual = (question: { id: string; subtopicId: string; statement: string; points: number }) =>
  db.insert(questions).values({ ...question, source: 'manual' }).run();
