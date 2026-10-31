import type { DiagnosticItem } from '@/types/domain';
import { mutate } from '../client/http';

export const approveForStudent = (id: string, studentId: string, approved: boolean) =>
  mutate('PATCH', `/diagnostics/${id}/students/${studentId}/approve`, { approved });
export const approveAll = (id: string) => mutate('POST', `/diagnostics/${id}/approve-all`);
export const publishDiagnostic = (id: string) => mutate('POST', `/diagnostics/${id}/publish`);
export const rejectForStudent = (id: string, studentId: string) => mutate('DELETE', `/diagnostics/${id}/students/${studentId}`);
export const rejectDiagnostic = (id: string) => mutate('DELETE', `/diagnostics/${id}`);
/** Substitui as questões do aluno. A avaliação dele volta a aguardar aprovação. */
export const saveItems = (id: string, studentId: string, items: DiagnosticItem[]) =>
  mutate('POST', `/diagnostics/${id}/students/${studentId}/items`, { items });
