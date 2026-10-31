import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { adaptationNeeds, adaptations, classes, exams } from '../db/schema';
import { groupBy } from '../lib/collections';
import type { Adaptation, AdaptationDecision } from '../types/domain';

export function listByExam(examId: string): Adaptation[] {
  const rows = db.select().from(adaptations).where(eq(adaptations.examId, examId)).all();
  const links = db.select().from(adaptationNeeds).where(inArray(adaptationNeeds.adaptationId, rows.map((r) => r.id))).orderBy(asc(adaptationNeeds.position)).all();
  const needs = groupBy(links, (n) => n.adaptationId, (n) => n.needId);
  return rows.map((r) => ({ ...r, needs: needs.get(r.id) ?? [] }));
}

export const findOwned = (teacherId: string, adaptationId: string) =>
  db.select({ id: adaptations.id, examId: adaptations.examId, status: exams.status }).from(adaptations)
    .innerJoin(exams, eq(exams.id, adaptations.examId))
    .innerJoin(classes, eq(classes.id, exams.classId))
    .where(and(eq(classes.teacherId, teacherId), eq(adaptations.id, adaptationId))).get();

export const insertMany = (rows: Omit<Adaptation, 'needs' | 'decision'>[]) => {
  if (rows.length) db.insert(adaptations).values(rows).run();
};

export const setDecision = (id: string, decision: AdaptationDecision) =>
  db.update(adaptations).set({ decision }).where(eq(adaptations.id, id)).run();

export const setAdapted = (id: string, adapted: string) =>
  db.update(adaptations).set({ adapted, decision: 'aceita' }).where(eq(adaptations.id, id)).run();

export const countPending = (examId: string) =>
  db.select({ total: count() }).from(adaptations).where(and(eq(adaptations.examId, examId), eq(adaptations.decision, 'pendente'))).get()!.total;

export const countAccepted = (examIds: string[]) =>
  db.select({ total: count() }).from(adaptations).where(and(inArray(adaptations.examId, examIds), eq(adaptations.decision, 'aceita'))).get()!.total;
