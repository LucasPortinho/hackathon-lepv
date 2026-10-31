import { transaction } from '../../db';
import { needIds } from '../../db/schema';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import type { DiagnosticItem } from '../../types/domain';
import { ensureProfile } from '../profiles/profile.service';
import { validateQuestionMetadata } from '../questions/question.validation';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireDiagnostic, requireStudent } from '../shared/guards';

/** Contrato PED → CRIA: inclui as lacunas persistidas e seus pré-requisitos. */
export function getCreatorContext(teacherId: string, id: string) {
  const diagnostic = requireDiagnostic(teacherId, id);
  return {
    diagnosticId: id, classId: diagnostic.classId, subjectId: diagnostic.subjectId,
    students: diagnostic.perStudent.map((plan) => {
      const student = requireStudent(teacherId, plan.studentId);
      const profile = ensureProfile(student, diagnostic.subjectId);
      return {
        student, focus: plan.focus,
        gaps: profile.gaps.filter((gap) => diagnostic.subtopicIds.includes(gap.subtopicId)),
        items: plan.items,
      };
    }),
  };
}

/** Recebe a saída do CRIA sem acoplar a API a um provedor de IA. */
export function saveCreatorItems(teacherId: string, id: string, studentId: string, items: DiagnosticItem[]) {
  const diagnostic = requireDiagnostic(teacherId, id);
  if (diagnostic.published || !['criador', 'adaptacao', 'revisao'].includes(diagnostic.stage)) {
    throw new ConflictError('A avaliação deve estar na criação ou revisão para receber questões do CRIA.');
  }
  if (!diagnostic.perStudent.some((plan) => plan.studentId === studentId)) throw new ValidationError('O aluno não faz parte desta avaliação.');
  if (!items.length || items.length > 500 || new Set(items.map((item) => item.id)).size !== items.length) {
    throw new ValidationError('Envie de 1 a 500 itens com identificadores distintos.');
  }
  const student = requireStudent(teacherId, studentId);
  const profile = ensureProfile(student, diagnostic.subjectId);
  const rows = items.map((item) => {
    validateQuestionMetadata(item);
    if (!item.id?.trim() || !item.statement?.trim()) throw new ValidationError('Informe o identificador e o enunciado de cada item.');
    if (!diagnostic.subtopicIds.includes(item.subtopicId)) throw new ValidationError('O subtópico do item não pertence à avaliação.');
    if (item.adaptedFor !== undefined && (!needIds.includes(item.adaptedFor) || !student.declaredNeeds.includes(item.adaptedFor))) {
      throw new ValidationError('A adaptação deve atender a uma necessidade declarada pelo aluno.');
    }
    if (item.prerequisite !== undefined && (typeof item.prerequisite !== 'string' || !item.prerequisite.trim())) {
      throw new ValidationError('O pré-requisito deve ser um texto não vazio.');
    }
    return { ...item, prerequisite: item.prerequisite ?? profile.gaps.find((gap) => gap.subtopicId === item.subtopicId)?.prerequisite };
  });
  transaction(() => diagnosticRepository.replaceStudentItems(id, studentId, rows));
  return requireDiagnostic(teacherId, id).perStudent.find((plan) => plan.studentId === studentId)!;
}
