import { BAND_MINS, bandIndex, knownValues, mean, meanOrNull } from '../../lib/score';
import * as adaptationRepository from '../../repositories/adaptation.repository';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as profileRepository from '../../repositories/profile.repository';
import type { DashboardData, DashboardRow, Exam, Student, Subtopic, SubtopicInsight } from '../../types/domain';
import type { DashboardQuery } from '../../types/inputs';
import { loadClassScores, type ClassScores } from '../shared/class-scores';
import { NotFoundError } from '../shared/errors';
import { requireClass } from '../shared/guards';

const ATTENTION_AVERAGE = 60;
const ATTENTION_CELL = 50;
const ATTENTION_LOW_CELLS = 2;
const STRUGGLING_BELOW = 60;

function buildRow(student: Student, topics: Subtopic[], periodId: string, scoreOf: ClassScores['scoreOf']): DashboardRow {
  const scores = Object.fromEntries(topics.map((t) => [t.id, scoreOf(student.id, t.id, periodId)]));
  return { student, scores, average: meanOrNull(Object.values(scores)) };
}

/** Só o que a turma já fez no período vira coluna: o catálogo da BNCC tem centenas de habilidades. */
function buildRows({ classId, subjectId, periodId }: DashboardQuery) {
  const { students, scoreOf } = loadClassScores(classId);
  const topics = catalogRepository.listSubtopics(subjectId).filter((t) => students.some((s) => scoreOf(s.id, t.id, periodId) !== null));
  return { topics, rows: students.map((s) => buildRow(s, topics, periodId, scoreOf)) };
}

function needsAttention(row: DashboardRow) {
  const lowCells = knownValues(Object.values(row.scores)).filter((v) => v < ATTENTION_CELL).length;
  return (row.average !== null && row.average < ATTENTION_AVERAGE) || lowCells >= ATTENTION_LOW_CELLS;
}

function buildKpis(rows: DashboardRow[], exams: Exam[]): DashboardData['kpis'] {
  return {
    average: meanOrNull(rows.map((r) => r.average)),
    attention: rows.filter(needsAttention).length,
    examsProcessed: exams.filter((e) => e.status === 'corrigida').length,
    adaptations: adaptationRepository.countAccepted(exams.map((e) => e.id)),
  };
}

function countPendingReviews(rows: DashboardRow[], subjectId: string) {
  const reviews = profileRepository.listReviews(rows.map((r) => r.student.id), subjectId);
  return rows.filter((r) => r.average !== null && reviews.get(r.student.id) !== 'aprovado').length;
}

export function getDashboard(teacherId: string, q: DashboardQuery): DashboardData {
  requireClass(teacherId, q.classId);
  const { rows, topics } = buildRows(q);
  const exams = examRepository.listByClass(q.classId).filter((e) => e.subjectId === q.subjectId);
  return { subtopics: topics, rows, kpis: buildKpis(rows, exams), pendingReviews: countPendingReviews(rows, q.subjectId) };
}

const studentsWithValue = (rows: DashboardRow[], subtopicId: string) =>
  rows.flatMap((r) => {
    const value = r.scores[subtopicId];
    return value === null ? [] : [{ student: r.student, value }];
  });

function countByBand(values: number[]) {
  const counts = BAND_MINS.map(() => 0);
  values.forEach((v) => counts[bandIndex(v)]++);
  return counts;
}

export function getSubtopicInsight(teacherId: string, q: DashboardQuery, subtopicId: string): SubtopicInsight {
  requireClass(teacherId, q.classId);
  const subtopic = catalogRepository.listSubtopics(q.subjectId).find((t) => t.id === subtopicId);
  if (!subtopic) throw new NotFoundError('Subtópico não encontrado.');
  const { students, scoreOf } = loadClassScores(q.classId);
  const rows = students.map((s) => buildRow(s, [subtopic], q.periodId, scoreOf));
  const withValue = studentsWithValue(rows, subtopicId);
  const values = withValue.map((w) => w.value);
  return {
    subtopic,
    average: mean(values),
    counts: countByBand(values),
    noData: rows.length - withValue.length,
    struggling: withValue.filter((w) => w.value < STRUGGLING_BELOW).sort((a, b) => a.student.name.localeCompare(b.student.name, 'pt-BR')),
  };
}
