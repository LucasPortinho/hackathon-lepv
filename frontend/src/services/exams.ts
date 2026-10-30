import { changed, db, newId } from '@/mocks/db';
import { needsLabel } from '@/mocks/needs';
import type { Adaptation, Exam, ExamGroup, ExamVersion, NeedId, Question } from '@/types/domain';
import { getScenario, mutate, request } from './client';
import { adaptQuestion } from './adaptationAgent';

export interface ExamWithClass extends Exam { className: string; groupName: string | null }

const decorate = (e: Exam): ExamWithClass => ({
  ...e,
  partialReads: e.partialReads ?? (getScenario() === 'parcial' && e.status === 'corrigida' ? e.questionIds.length : undefined),
  className: db.classes.find((c) => c.id === e.classId)?.name ?? '',
  groupName: db.groups.find((g) => g.id === e.groupId)?.name ?? null,
});

export const listExams = () => request(() => db.exams.map(decorate).sort((a, b) => b.date.localeCompare(a.date)), { empty: () => [] });
export const listGroups = (classId: string) => request(() => db.groups.filter((g) => g.classId === classId), { empty: () => [] });
export const listClassExams = (classId: string) => request(() => db.exams.filter((e) => e.classId === classId).map(decorate), { empty: () => [] });
export const getExam = (id: string) =>
  request(() => {
    const e = db.exams.find((x) => x.id === id);
    if (!e) throw new Error('Prova não encontrada.');
    return { exam: decorate(e), questions: e.questionIds.map((q) => db.questions.find((x) => x.id === q)!) };
  });
export const listBank = () => request(() => db.questions.filter((q) => q.source === 'banco'), { empty: () => [] });

export const moveExam = (examId: string, groupId: string | null) =>
  mutate(() => {
    db.exams.find((e) => e.id === examId)!.groupId = groupId;
    changed();
  }, 80);

export const createGroup = (classId: string, name: string) =>
  mutate((): ExamGroup => {
    const g = { id: newId('g'), classId, name };
    db.groups.push(g);
    changed();
    return g;
  });

export interface NewExam { title: string; classId: string; subjectId: string; groupId: string | null; date: string; questions: (Question | { statement: string; subtopicId: string; points: number })[] }

export const createExam = (input: NewExam) =>
  mutate(() => {
    const questionIds = input.questions.map((q) => {
      if ('id' in q) return q.id;
      const id = newId('q');
      db.questions.push({ id, subtopicId: q.subtopicId, statement: q.statement, points: q.points, source: 'manual' });
      return id;
    });
    const exam: Exam = { id: newId('e'), title: input.title, classId: input.classId, subjectId: input.subjectId, groupId: input.groupId, date: input.date, status: 'rascunho', questionIds, versions: [] };
    db.exams.push(exam);
    changed();
    return exam;
  });

/** Declared needs in the exam's class, with how many students each one affects. */
export const getNeedCounts = (examId: string) =>
  request(() => {
    const exam = db.exams.find((e) => e.id === examId)!;
    const counts = {} as Record<NeedId, number>;
    db.students.filter((s) => s.classId === exam.classId).forEach((s) => s.declaredNeeds.forEach((n) => (counts[n] = (counts[n] ?? 0) + 1)));
    return counts;
  });

const NEED_ORDER: NeedId[] = ['daltonismo', 'tdah', 'tea', 'dislexia', 'discalculia'];

function planVersions(exam: Exam, needs: NeedId[]): ExamVersion[] {
  const students = db.students.filter((s) => s.classId === exam.classId);
  const groups = new Map<string, ExamVersion>();
  needs.forEach((n) => groups.set(n, { id: `v-${n}`, label: needsLabel([n]), needs: [n], studentIds: [] }));
  for (const s of students) {
    const mine = NEED_ORDER.filter((n) => s.declaredNeeds.includes(n) && needs.includes(n));
    if (!mine.length) continue;
    const key = mine.join('+');
    if (!groups.has(key)) groups.set(key, { id: `v-${key}`, label: `Combinada: ${needsLabel(mine)}`, needs: mine, studentIds: [] });
    groups.get(key)!.studentIds.push(s.id);
  }
  return [...groups.values()];
}

export const generateAdaptations = (examId: string, needs: NeedId[]) =>
  mutate(() => {
    const exam = db.exams.find((e) => e.id === examId)!;
    const versions = planVersions(exam, needs);
    db.adaptations = db.adaptations.filter((a) => a.examId !== examId);
    for (const v of versions) {
      for (const qid of exam.questionIds) {
        const q = db.questions.find((x) => x.id === qid)!;
        const result = adaptQuestion(q, v.needs);
        if (!result) continue;
        db.adaptations.push({ id: newId('a'), examId, questionId: qid, versionId: v.id, needs: v.needs, original: q.statement, adapted: result.text, rationale: result.why, decision: 'pendente' });
      }
    }
    exam.status = 'em_adaptacao';
    exam.versions = versions;
    db.runs.unshift({ id: newId('r'), agent: 'adaptacao', status: 'atencao', at: new Date().toISOString(), summary: `Adaptou "${exam.title}" para ${needsLabel(needs)}`, detail: 'Aguardando a sua revisão.', link: { label: 'Revisar', to: `/provas/${examId}/adaptar` } });
    changed();
    return versions;
  }, 300);

export const getAdaptations = (examId: string) =>
  request(() => {
    const exam = db.exams.find((e) => e.id === examId)!;
    const names = new Map(db.students.map((s) => [s.id, s.name]));
    return {
      exam: decorate(exam),
      versions: exam.versions.filter((v) => v.needs.length),
      adaptations: db.adaptations.filter((a) => a.examId === examId),
      studentNames: names,
    };
  }, { ms: 200 });

export const decideAdaptation = (id: string, decision: Adaptation['decision']) =>
  mutate(() => {
    db.adaptations.find((a) => a.id === id)!.decision = decision;
    changed();
  }, 60);

export const editAdaptation = (id: string, adapted: string) =>
  mutate(() => {
    const a = db.adaptations.find((x) => x.id === id)!;
    a.adapted = adapted;
    a.decision = 'aceita';
    changed();
  }, 60);

export const finishAdaptation = (examId: string) =>
  mutate(() => {
    const exam = db.exams.find((e) => e.id === examId)!;
    const adapted = exam.versions.filter((v) => v.needs.length);
    const taken = new Set(adapted.flatMap((v) => v.studentIds));
    const rest = db.students.filter((s) => s.classId === exam.classId && !taken.has(s.id)).map((s) => s.id);
    exam.versions = [{ id: 'v-original', label: 'Original', needs: [], studentIds: rest }, ...adapted];
    exam.status = 'pronta';
    db.notifications.unshift({ id: newId('n'), title: 'Versões prontas', body: `"${exam.title}" tem ${exam.versions.length} versões organizadas.`, at: new Date().toISOString(), read: false, to: `/provas/${examId}` });
    changed();
  });
