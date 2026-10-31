import type { Score } from '../types/domain';

/** Limites inferiores das faixas do histograma, na mesma ordem de `BANDS` no frontend. */
export const BAND_MINS = [90, 80, 70, 60, 50, 40, 0];

export const bandIndex = (v: number) => BAND_MINS.findIndex((min) => v >= min);
export const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
export const knownValues = (values: (number | null)[]) => values.filter((v): v is number => v !== null);

/** Ausência de nota não vira zero: sem nenhum valor conhecido, a média também é ausente. */
export function meanOrNull(values: (number | null)[]) {
  const known = knownValues(values);
  return known.length ? mean(known) : null;
}

/** Uma avaliação isolada entra pela média com a nota anterior: não apaga o histórico do aluno. */
export const blendScore = (previous: number | null, result: number) => (previous === null ? result : mean([previous, result]));

export type ScoreLookup = (studentId: string, subtopicId: string, periodId: string) => number | null;

const scoreKey = (studentId: string, subtopicId: string, periodId: string) => `${studentId}:${subtopicId}:${periodId}`;

export function scoreLookup(scores: Score[]): ScoreLookup {
  const values = new Map(scores.map((s) => [scoreKey(s.studentId, s.subtopicId, s.periodId), s.value]));
  return (studentId, subtopicId, periodId) => values.get(scoreKey(studentId, subtopicId, periodId)) ?? null;
}
