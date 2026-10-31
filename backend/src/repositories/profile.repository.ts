import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { competencyGaps, profileStrengths, studentPedagogicalProfiles as profiles } from '../db/schema';
import { nowIso } from '../lib/time';
import type { CompetencyGap, NeedId, PedagogicalProfile, ReviewStatus } from '../types/domain';

const isProfile = (studentId: string, subjectId: string) => and(eq(profiles.studentId, studentId), eq(profiles.subjectId, subjectId));
const isStrengthOf = (studentId: string, subjectId: string) => and(eq(profileStrengths.studentId, studentId), eq(profileStrengths.subjectId, subjectId));
const isGapOf = (studentId: string, subjectId: string) => and(eq(competencyGaps.studentId, studentId), eq(competencyGaps.subjectId, subjectId));

const toGap = (row: typeof competencyGaps.$inferSelect): CompetencyGap => ({
  id: row.id,
  subtopicId: row.subtopicId,
  competency: row.competency,
  reading: row.readingKind === 'necessidade' ? { kind: 'necessidade', needId: row.needId as NeedId } : { kind: 'tecnica' },
  note: row.note,
  suggestion: row.suggestion,
});

const toGapRow = (gap: CompetencyGap, studentId: string, subjectId: string, position: number) => ({
  id: gap.id,
  studentId,
  subjectId,
  subtopicId: gap.subtopicId,
  competency: gap.competency,
  readingKind: gap.reading.kind,
  needId: gap.reading.kind === 'necessidade' ? gap.reading.needId : null,
  note: gap.note,
  suggestion: gap.suggestion,
  position,
});

const listStrengths = (studentId: string, subjectId: string) =>
  db.select().from(profileStrengths).where(isStrengthOf(studentId, subjectId)).orderBy(asc(profileStrengths.position)).all().map((s) => s.strength);

const listGaps = (studentId: string, subjectId: string) =>
  db.select().from(competencyGaps).where(isGapOf(studentId, subjectId)).orderBy(asc(competencyGaps.position)).all().map(toGap);

export function find(studentId: string, subjectId: string): PedagogicalProfile | undefined {
  const row = db.select().from(profiles).where(isProfile(studentId, subjectId)).get();
  if (!row) return undefined;
  const { overall, delta, summary, review, reviewedAt } = row;
  return { studentId, overall, delta, summary, review, reviewedAt: reviewedAt ?? undefined, strengths: listStrengths(studentId, subjectId), gaps: listGaps(studentId, subjectId) };
}

export function listReviews(studentIds: string[], subjectId: string): Map<string, ReviewStatus> {
  const rows = db.select({ studentId: profiles.studentId, review: profiles.review }).from(profiles)
    .where(and(inArray(profiles.studentId, studentIds), eq(profiles.subjectId, subjectId))).all();
  return new Map(rows.map((r) => [r.studentId, r.review]));
}

function upsertProfile({ studentId, overall, delta, summary, review }: PedagogicalProfile, subjectId: string, periodId: string) {
  const values = { periodId, overall, delta, summary, review, reviewedAt: null, updatedAt: nowIso() };
  db.insert(profiles).values({ ...values, studentId, subjectId })
    .onConflictDoUpdate({ target: [profiles.studentId, profiles.subjectId], set: values }).run();
}

function replaceStrengths(studentId: string, subjectId: string, strengths: string[]) {
  db.delete(profileStrengths).where(isStrengthOf(studentId, subjectId)).run();
  if (strengths.length) db.insert(profileStrengths).values(strengths.map((strength, position) => ({ studentId, subjectId, position, strength }))).run();
}

function replaceGaps(studentId: string, subjectId: string, gaps: CompetencyGap[]) {
  db.delete(competencyGaps).where(isGapOf(studentId, subjectId)).run();
  if (gaps.length) db.insert(competencyGaps).values(gaps.map((g, position) => toGapRow(g, studentId, subjectId, position))).run();
}

/** Substitui o perfil atual: há um único perfil por aluno e disciplina, sem histórico. */
export function save(profile: PedagogicalProfile, subjectId: string, periodId: string) {
  upsertProfile(profile, subjectId, periodId);
  replaceStrengths(profile.studentId, subjectId, profile.strengths);
  replaceGaps(profile.studentId, subjectId, profile.gaps);
}

export const setReview = (studentId: string, subjectId: string, review: ReviewStatus, reviewedAt: string | null) =>
  db.update(profiles).set({ review, reviewedAt, updatedAt: nowIso() }).where(isProfile(studentId, subjectId)).run();

export const setSummary = (studentId: string, subjectId: string, summary: string) =>
  db.update(profiles).set({ summary, updatedAt: nowIso() }).where(isProfile(studentId, subjectId)).run();

export const setGapNote = (gapId: string, note: string) =>
  db.update(competencyGaps).set({ note }).where(eq(competencyGaps.id, gapId)).run();
