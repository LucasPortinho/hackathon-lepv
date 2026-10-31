import type { ExamGroup, ExamStatus, ExamVersion } from '../../../types/domain';
import { students } from './students';

export interface SeedExam { id: string; title: string; classId: string; subjectId: string; groupId: string; date: string; status: ExamStatus; questionIds: string[]; versions: ExamVersion[] }

export const examGroups: ExamGroup[] = [
  { id: 'g-b1', classId: 'c-9b', name: '1º Bimestre' },
  { id: 'g-b2', classId: 'c-9b', name: '2º Bimestre' },
  { id: 'g-b3', classId: 'c-9b', name: '3º Bimestre' },
  { id: 'g-rec', classId: 'c-9b', name: 'Recuperação' },
  { id: 'g-a-b3', classId: 'c-9a', name: '3º Bimestre' },
];

const original = (studentIds: string[]) => ({ id: 'v-original', label: 'Original', needs: [] as ExamVersion['needs'], studentIds });
const ids9b = students.filter((s) => s.classId === 'c-9b').map((s) => s.id);

export const exams: SeedExam[] = [
  { id: 'e-numeros', title: 'Números reais e porcentagem', classId: 'c-9b', subjectId: 'mat', groupId: 'g-b1', date: '2026-04-16', status: 'corrigida', questionIds: ['q5', 'q7', 'q12', 'q15'], versions: [original(ids9b)] },
  { id: 'e-funcoes', title: 'Funções', classId: 'c-9b', subjectId: 'mat', groupId: 'g-b2', date: '2026-06-18', status: 'corrigida', questionIds: ['q8', 'q16', 'q6'], versions: [original(ids9b)] },
  { id: 'e-equacoes', title: 'Fatoração e equações do 2º grau', classId: 'c-9b', subjectId: 'mat', groupId: 'g-b3', date: '2026-08-27', status: 'corrigida', questionIds: ['q6', 'q13', 'q9', 'q14'], versions: [original(ids9b)] },
  { id: 'e-pitagoras', title: 'Semelhança e teorema de Pitágoras', classId: 'c-9b', subjectId: 'mat', groupId: 'g-b3', date: '2026-11-12', status: 'rascunho', questionIds: ['q1', 'q2', 'q3', 'q4', 'q10'], versions: [] },
  { id: 'e-rec', title: 'Recuperação de geometria', classId: 'c-9b', subjectId: 'mat', groupId: 'g-rec', date: '2026-11-26', status: 'rascunho', questionIds: ['q5', 'q9', 'q10'], versions: [] },
  { id: 'e-a-1', title: 'Avaliação de geometria e medidas', classId: 'c-9a', subjectId: 'mat', groupId: 'g-a-b3', date: '2026-09-03', status: 'corrigida', questionIds: ['q5', 'q10', 'q1'], versions: [original(students.filter((s) => s.classId === 'c-9a').map((s) => s.id))] },
];

/** Prova com folhas lidas: alimenta a contagem de leituras parciais. */
export const READ_EXAM_ID = 'e-equacoes';
