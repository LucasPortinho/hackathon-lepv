import { unique } from '../../lib/collections';
import { newId } from '../../lib/ids';
import { nowIso } from '../../lib/time';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import type { Class, DiagnosticStep, Subtopic } from '../../types/domain';
import { periodWindow } from '../catalog/catalog.service';
import { loadClassScores } from '../shared/class-scores';
import { ValidationError } from '../shared/errors';
import { requireClass, requireDiagnostic } from '../shared/guards';

const STEPS: Omit<DiagnosticStep, 'status'>[] = [
  { id: 'pedagogico', title: 'Agente Pedagógico', description: 'Analisa os perfis e escolhe quem se beneficia.' },
  { id: 'adaptacao', title: 'Agente de Adaptação', description: 'Ajusta o formato para necessidades declaradas.' },
  { id: 'criador', title: 'Agente Criador', description: 'Gera as questões de cada aluno.' },
  { id: 'respostas', title: 'Alunos respondem', description: 'Você imprime, aplica e envia as respostas.' },
  { id: 'devolutiva', title: 'Devolutiva', description: 'Os resultados voltam aos perfis e ao painel.' },
];

export const initialSteps = (): DiagnosticStep[] => STEPS.map((s, i) => ({ ...s, status: i === 0 ? 'executando' : 'pendente' }));

export const listDiagnostics = (teacherId: string) => diagnosticRepository.listByTeacher(teacherId);

export function getDiagnostic(teacherId: string, id: string) {
  const diagnostic = requireDiagnostic(teacherId, id);
  const { students } = loadClassScores(diagnostic.classId);
  return {
    diagnostic,
    students: Object.fromEntries(students.map((s) => [s.id, s])),
    className: requireClass(teacherId, diagnostic.classId).name,
  };
}

/** Subtópicos com resultado na turma, começando pela menor média. */
export function suggestSubtopics(teacherId: string, classId: string, subjectId: string) {
  requireClass(teacherId, classId);
  const periodId = periodWindow().current.id;
  const { average } = loadClassScores(classId);
  return catalogRepository.listSubtopics(subjectId)
    .map((subtopic) => ({ subtopic, average: average(subtopic.id, periodId) }))
    .filter((s) => s.average > 0)
    .sort((a, b) => a.average - b.average);
}

function requireSubtopics(ids: string[]) {
  const subtopics = catalogRepository.findSubtopicsByIds(ids);
  if (!ids.length) throw new ValidationError('Escolha ao menos um subtópico.');
  if (subtopics.length !== ids.length) throw new ValidationError('Subtópico desconhecido.');
  return ids.map((id) => subtopics.find((t) => t.id === id)!);
}

function requireSingleSubject(subtopics: Subtopic[], cls: Class) {
  const subjectId = subtopics[0].subjectId;
  if (subtopics.some((t) => t.subjectId !== subjectId)) throw new ValidationError('Os subtópicos devem ser da mesma disciplina.');
  if (!cls.subjectIds.includes(subjectId)) throw new ValidationError('A turma não tem esta disciplina.');
  return subjectId;
}

export function createDiagnostic(teacherId: string, classId: string, subtopicIds: string[]) {
  const cls = requireClass(teacherId, classId);
  const subtopics = requireSubtopics(unique(subtopicIds));
  const subjectId = requireSingleSubject(subtopics, cls);
  const id = newId('d');
  diagnosticRepository.insert({
    id, classId, subjectId, title: subtopics.map((t) => t.name).join(' e '), subtopicIds: subtopics.map((t) => t.id),
    createdAt: nowIso(), steps: initialSteps(),
  });
  return requireDiagnostic(teacherId, id);
}
