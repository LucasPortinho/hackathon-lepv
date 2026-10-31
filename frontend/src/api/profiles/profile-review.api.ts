import { mutate, withQuery } from '../client/http';

const review = (studentId: string, subjectId: string, body: unknown) =>
  mutate('PATCH', withQuery(`/students/${studentId}/profile/review`, { subjectId }), body);

export const approveProfile = (studentId: string, subjectId: string) => review(studentId, subjectId, { reviewStatus: 'aprovado' });
export const reopenProfile = (studentId: string, subjectId: string) => review(studentId, subjectId, { reviewStatus: 'rascunho' });
export const saveProfileEdit = (studentId: string, subjectId: string, summary: string, gapNotes: Record<string, string>) =>
  review(studentId, subjectId, { reviewStatus: 'editado', summary, gapNotes });
