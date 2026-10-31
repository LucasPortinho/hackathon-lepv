import type { Diagnostic, Student, Subtopic } from '@/types/domain';
import { DEFAULT_SUBJECT_ID } from '../catalog/catalog.store';
import { get, mutate, withQuery } from '../client/http';

interface DiagnosticResponse { diagnostic: Diagnostic; students: Record<string, Student>; className: string }

export const listDiagnostics = () => get<Diagnostic[]>('/diagnostics', { empty: [] });

export async function getDiagnostic(id: string) {
  const data = await get<DiagnosticResponse>(`/diagnostics/${id}`);
  return { ...data, students: new Map(Object.entries(data.students)) };
}

export const suggestSubtopics = (classId: string, subjectId = DEFAULT_SUBJECT_ID) =>
  get<{ subtopic: Subtopic; average: number }[]>(withQuery('/diagnostics/suggestions', { classId, subjectId }));

export const createDiagnostic = (classId: string, subtopicIds: string[]) =>
  mutate<Diagnostic>('POST', '/diagnostics', { classId, subtopicIds });
