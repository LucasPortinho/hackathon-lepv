// Entradas dos services: base dos DTOs combinados com os controllers.
import type { NeedId, QuestionMetadata, SheetReadStatus } from './domain';

export interface ClassInput { name: string; level: string; school: string; year: number; grade?: number | null; subjectIds: string[] }

export interface StudentInput { name: string; classId: string; declaredNeeds: NeedId[] }

export interface DashboardQuery { classId: string; subjectId: string; periodId: string }

export interface ManualQuestion extends QuestionMetadata { statement: string; subtopicId: string; points: number }

export interface NewExam {
  title: string;
  classId: string;
  subjectId: string;
  groupId: string | null;
  date: string;
  /** Com `id`, referencia uma questão existente; sem `id`, cria uma questão manual. */
  questions: ({ id: string } | ManualQuestion)[];
}

export interface NewFile { name: string; size: number; kind: 'prova' | 'respostas'; storagePath?: string }

export interface ReadSheet { studentId?: string; studentName?: string; readStatus: SheetReadStatus; partialReason?: string; extractedText?: string }
