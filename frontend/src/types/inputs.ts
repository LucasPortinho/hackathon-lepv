// Entradas da API. Espelham backend/src/types/inputs.ts.
import type { Question } from './domain';

export interface DashboardQuery { classId: string; subjectId: string; periodId: string }

export interface ManualQuestion { statement: string; subtopicId: string; points: number }

export interface NewExam {
  title: string;
  classId: string;
  subjectId: string;
  groupId: string | null;
  date: string;
  questions: (Question | ManualQuestion)[];
}

export interface NewFile { name: string; size: number; kind: 'prova' | 'gabarito' }
