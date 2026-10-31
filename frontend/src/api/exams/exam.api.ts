import type { ExamGroup, ExamWithClass, Question } from '@/types/domain';
import type { NewExam } from '@/types/inputs';
import { get, mutate } from '../client/http';

export const listExams = () => get<ExamWithClass[]>('/exams', { empty: [] });
export const listClassExams = (classId: string) => get<ExamWithClass[]>(`/classes/${classId}/exams`, { empty: [] });
export const listGroups = (classId: string) => get<ExamGroup[]>(`/classes/${classId}/groups`, { empty: [] });
export const listBank = () => get<Question[]>('/questions/bank', { empty: [] });
export const getExam = (id: string) => get<{ exam: ExamWithClass; questions: Question[] }>(`/exams/${id}`);

export const moveExam = (examId: string, groupId: string | null) => mutate('PATCH', `/exams/${examId}/group`, { groupId });
export const createGroup = (classId: string, name: string) => mutate<ExamGroup>('POST', `/classes/${classId}/groups`, { name });

/** Questões do banco seguem só pelo id; as manuais levam o próprio conteúdo. */
const toQuestionInput = (q: NewExam['questions'][number]) =>
  'id' in q ? { id: q.id } : { statement: q.statement, subtopicId: q.subtopicId, points: q.points };

export const createExam = (input: NewExam) =>
  mutate<ExamWithClass>('POST', '/exams', { ...input, questions: input.questions.map(toQuestionInput) });
