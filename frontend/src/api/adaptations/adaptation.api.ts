import type { Adaptation, ExamVersion, ExamWithClass, NeedId } from '@/types/domain';
import { get, mutate } from '../client/http';

interface AdaptationsResponse { exam: ExamWithClass; versions: ExamVersion[]; adaptations: Adaptation[]; studentNames: Record<string, string> }

/** Necessidades declaradas na turma da prova, com quantos alunos cada uma afeta. */
export const getNeedCounts = (examId: string) => get<Record<NeedId, number>>(`/exams/${examId}/need-counts`);

export async function getAdaptations(examId: string) {
  const data = await get<AdaptationsResponse>(`/exams/${examId}/adaptations`);
  return { ...data, studentNames: new Map(Object.entries(data.studentNames)) };
}

export const generateAdaptations = (examId: string, needs: NeedId[]) => mutate<ExamVersion[]>('POST', `/exams/${examId}/adapt`, { needs });
export const decideAdaptation = (id: string, decision: Adaptation['decision']) => mutate('PATCH', `/adaptations/${id}`, { decision });
export const editAdaptation = (id: string, adapted: string) => mutate('PATCH', `/adaptations/${id}`, { adapted });
export const finishAdaptation = (examId: string) => mutate('POST', `/exams/${examId}/adaptations/finish`);
