import type { ExamCorrections, ExamGroup, ExamQuestion, ExamWithClass, Question, SolutionReadResult } from '@/types/domain';
import type { NewExam } from '@/types/inputs';
import { BASE, get, mutate, sendFile } from '../client/http';
import { changed } from '../client/invalidation';

export const listExams = () => get<ExamWithClass[]>('/exams', { empty: [] });
export const listClassExams = (classId: string) => get<ExamWithClass[]>(`/classes/${classId}/exams`, { empty: [] });
export const listGroups = (classId: string) => get<ExamGroup[]>(`/classes/${classId}/groups`, { empty: [] });
export const listBank = () => get<Question[]>('/questions/bank', { empty: [] });
export const getExam = (id: string) => get<{ exam: ExamWithClass; questions: ExamQuestion[] }>(`/exams/${id}`);
export const deleteExam = (id: string) => mutate('DELETE', `/exams/${id}`);

export const listCorrections = (examId: string) => get<ExamCorrections>(`/exams/${examId}/corrections`);
export const sheetImageUrl = (examId: string, sheetId: string) => `${BASE}/exams/${examId}/sheets/${sheetId}/image`;

export const moveExam = (examId: string, groupId: string | null) => mutate('PATCH', `/exams/${examId}/group`, { groupId });
export const createGroup = (classId: string, name: string) => mutate<ExamGroup>('POST', `/classes/${classId}/groups`, { name });

/** Questões do banco seguem só pelo id; as manuais levam o próprio conteúdo. */
const toQuestionInput = (q: NewExam['questions'][number]) =>
  'id' in q ? { id: q.id } : { statement: q.statement, subtopicId: q.subtopicId, points: q.points, answerKey: q.answerKey, solution: q.solution };

export const createExam = (input: NewExam) =>
  mutate<ExamWithClass>('POST', '/exams', { ...input, questions: input.questions.map(toQuestionInput) });

export const setQuestionKey = (examId: string, questionId: string, key: { answerKey: string | null; solution: string | null }) =>
  mutate('PUT', `/exams/${examId}/questions/${questionId}/key`, key);

/** A IA lê a resolução do professor e preenche o gabarito das questões. Pode levar alguns instantes. */
export async function uploadSolution(examId: string, file: File) {
  const result = await sendFile<SolutionReadResult>(`/exams/${examId}/solution?name=${encodeURIComponent(file.name)}`, file);
  changed();
  return result;
}
