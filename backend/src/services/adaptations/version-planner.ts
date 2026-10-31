import { needIds } from '../../db/schema';
import { newId } from '../../lib/ids';
import type { Adaptation, ExamVersion, NeedId, Question, Student } from '../../types/domain';
import { adaptQuestion } from '../agents/adaptation.agent';

type Labeler = (id: NeedId) => string;

export const needsLabel = (ids: NeedId[], needLabel: Labeler) => ids.map(needLabel).join(' + ');

const singleVersion = (need: NeedId, needLabel: Labeler): ExamVersion =>
  ({ id: `v-${need}`, label: needLabel(need), needs: [need], studentIds: [] });

const combinedVersion = (key: string, needs: NeedId[], needLabel: Labeler): ExamVersion =>
  ({ id: `v-${key}`, label: `Combinada: ${needsLabel(needs, needLabel)}`, needs, studentIds: [] });

/** Uma versão por necessidade escolhida e versões combinadas para quem acumula mais de uma. */
export function planVersions(students: Student[], chosen: NeedId[], needLabel: Labeler): ExamVersion[] {
  const versions = new Map(chosen.map((n) => [n as string, singleVersion(n, needLabel)]));
  for (const student of students) {
    const needs = needIds.filter((n) => student.declaredNeeds.includes(n) && chosen.includes(n));
    if (!needs.length) continue;
    const key = needs.join('+');
    if (!versions.has(key)) versions.set(key, combinedVersion(key, needs, needLabel));
    versions.get(key)!.studentIds.push(student.id);
  }
  return [...versions.values()];
}

function adaptForVersion(examId: string, version: ExamVersion, question: Question, needLabel: Labeler) {
  const result = adaptQuestion(question, version.needs, needLabel);
  return result ? [{ id: newId('a'), examId, questionId: question.id, versionId: version.id, original: question.statement, adapted: result.text, rationale: result.why }] : [];
}

export const buildAdaptations = (examId: string, versions: ExamVersion[], questions: Question[], needLabel: Labeler): Omit<Adaptation, 'needs' | 'decision'>[] =>
  versions.flatMap((v) => questions.flatMap((q) => adaptForVersion(examId, v, q, needLabel)));
