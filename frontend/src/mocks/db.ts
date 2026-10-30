import type { Adaptation, AgentRun, AppNotification, Diagnostic, Exam, ExamGroup, PedagogicalProfile, Question, Score } from '@/types/domain';
import { QUESTION_BANK } from './questions';
import * as seed from './seed';

/** In-memory stand-in for a backend. A reload restores the seeded demo, on purpose. */
export const db = {
  classes: [...seed.classes],
  students: [...seed.students],
  scores: seed.scores as Score[],
  groups: [...seed.examGroups] as ExamGroup[],
  exams: seed.exams.map((e) => ({ ...e })) as Exam[],
  questions: [...QUESTION_BANK] as Question[],
  adaptations: [] as Adaptation[],
  runs: [...seed.agentRuns] as AgentRun[],
  notifications: [...seed.notifications] as AppNotification[],
  diagnostics: [] as Diagnostic[],
  profiles: new Map<string, PedagogicalProfile>(),
  profileEdits: new Map<string, Partial<PedagogicalProfile>>(),
};

const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
/** Every mutation calls this, so mounted queries refresh themselves like a real cache would. */
export const changed = () => listeners.forEach((fn) => fn());

let nextId = 1000;
export const newId = (prefix: string) => `${prefix}-${++nextId}`;
