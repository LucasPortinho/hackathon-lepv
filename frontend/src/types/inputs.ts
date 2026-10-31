// Entradas da API. Espelham backend/src/types/inputs.ts.
import type { NeedId, Question } from './domain';

export interface ClassInput { name: string; level: string; school: string; year: number; subjectIds: string[] }

export interface StudentInput { name: string; classId: string; declaredNeeds: NeedId[] }

export interface DashboardQuery { classId: string; subjectId: string; periodId: string }

export interface ManualQuestion { statement: string; subtopicId: string; points: number; answerKey?: string; solution?: string }

export interface NewExam {
  title: string;
  classId: string;
  subjectId: string;
  groupId: string | null;
  date: string;
  questions: (Question | ManualQuestion)[];
}

export interface NewFile { name: string; size: number; kind: 'respostas' }
