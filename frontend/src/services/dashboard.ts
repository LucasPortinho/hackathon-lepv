import { db } from '@/mocks/db';
import { subtopics } from '@/mocks/seed';
import type { DashboardData, DashboardRow, SubtopicInsight } from '@/types/domain';
import { bandIndex, BANDS, mean } from '@/lib/score';
import { getScenario, request } from './client';
import { profileFor } from './profiles';

export const ATTENTION_AVERAGE = 60;
export const ATTENTION_CELL = 50;

export interface DashboardQuery { classId: string; subjectId: string; periodId: string }

function buildRows({ classId, subjectId, periodId }: DashboardQuery): { rows: DashboardRow[]; topics: typeof subtopics } {
  const topics = subtopics.filter((t) => t.subjectId === subjectId);
  const students = db.students.filter((s) => s.classId === classId);
  const partial = getScenario() === 'parcial';
  const rows = students.map((student, r) => {
    const scores: Record<string, number | null> = {};
    topics.forEach((t, c) => {
      const v = db.scores.find((s) => s.studentId === student.id && s.subtopicId === t.id && s.periodId === periodId)?.value ?? null;
      scores[t.id] = partial && (r + c) % 3 === 0 ? null : v;
    });
    const known = Object.values(scores).filter((v): v is number => v !== null);
    return { student, scores, average: known.length ? mean(known) : null };
  });
  return { rows, topics };
}

export const needsAttention = (row: DashboardRow) =>
  (row.average !== null && row.average < ATTENTION_AVERAGE) || Object.values(row.scores).filter((v) => v !== null && v < ATTENTION_CELL).length >= 2;

export const getDashboard = (q: DashboardQuery) =>
  request(
    (): DashboardData => {
      const { rows, topics } = buildRows(q);
      const avgs = rows.map((r) => r.average).filter((v): v is number => v !== null);
      const exams = db.exams.filter((e) => e.classId === q.classId && e.subjectId === q.subjectId);
      return {
        subtopics: topics,
        rows,
        kpis: {
          average: avgs.length ? mean(avgs) : null,
          attention: rows.filter(needsAttention).length,
          examsProcessed: exams.filter((e) => e.status === 'corrigida').length,
          adaptations: db.adaptations.filter((a) => a.decision === 'aceita' && exams.some((e) => e.id === a.examId)).length,
        },
        pendingReviews: q.subjectId === 'mat' ? rows.filter((r) => profileFor(r.student).review !== 'aprovado').length : 0,
      };
    },
    { empty: () => ({ subtopics: [], rows: [], kpis: { average: null, attention: 0, examsProcessed: 0, adaptations: 0 }, pendingReviews: 0 }) },
  );

export const getSubtopicInsight = (q: DashboardQuery, subtopicId: string) =>
  request((): SubtopicInsight => {
    const { rows, topics } = buildRows(q);
    const subtopic = topics.find((t) => t.id === subtopicId)!;
    const withValue = rows.flatMap((r) => (r.scores[subtopicId] === null ? [] : [{ student: r.student, value: r.scores[subtopicId] as number }]));
    const counts = BANDS.map(() => 0);
    withValue.forEach((w) => counts[bandIndex(w.value)]++);
    return {
      subtopic,
      average: mean(withValue.map((w) => w.value)),
      counts,
      noData: rows.length - withValue.length,
      struggling: withValue.filter((w) => w.value < 60).sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')),
    };
  });
