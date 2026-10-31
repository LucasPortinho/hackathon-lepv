import { mutate } from '../client/http';

export const approveForStudent = (id: string, studentId: string, approved: boolean) =>
  mutate('PATCH', `/diagnostics/${id}/students/${studentId}/approve`, { approved });
export const approveAll = (id: string) => mutate('POST', `/diagnostics/${id}/approve-all`);
export const publishDiagnostic = (id: string) => mutate('POST', `/diagnostics/${id}/publish`);
