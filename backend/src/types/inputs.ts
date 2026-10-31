// Entradas dos services: base dos DTOs combinados com os controllers.
import type { SheetReadStatus } from './domain';

export interface DashboardQuery { classId: string; subjectId: string; periodId: string }

export interface ManualQuestion { statement: string; subtopicId: string; points: number }

export interface NewExam {
  title: string;
  classId: string;
  subjectId: string;
  groupId: string | null;
  date: string;
  /** Com `id`, referencia uma questão existente; sem `id`, cria uma questão manual. */
  questions: ({ id: string } | ManualQuestion)[];
}

export interface NewFile { name: string; size: number; kind: 'prova' | 'gabarito'; storagePath?: string }

export interface ReadSheet { studentId?: string; studentName?: string; readStatus: SheetReadStatus; partialReason?: string; extractedText?: string }
