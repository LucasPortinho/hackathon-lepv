import { transaction } from '../../db';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import type { Diagnostic } from '../../types/domain';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireDiagnostic } from '../shared/guards';

function requireInReview(teacherId: string, id: string) {
  const d = requireDiagnostic(teacherId, id);
  if (d.stage !== 'revisao') throw new ConflictError('A avaliação não está em revisão.');
  return d;
}

export function approveForStudent(teacherId: string, id: string, studentId: string, approved: boolean) {
  const d = requireInReview(teacherId, id);
  if (!d.perStudent.some((p) => p.studentId === studentId)) throw new ValidationError('O aluno não faz parte desta avaliação.');
  diagnosticRepository.setApproved(id, studentId, approved);
}

export function approveAll(teacherId: string, id: string) {
  requireInReview(teacherId, id);
  diagnosticRepository.approveAll(id);
}

/** O aluno sai da avaliação e fica sem esta atividade; os demais seguem em revisão. */
export function rejectForStudent(teacherId: string, id: string, studentId: string) {
  const d = requireInReview(teacherId, id);
  if (!d.perStudent.some((p) => p.studentId === studentId)) throw new ValidationError('O aluno não faz parte desta avaliação.');
  if (d.perStudent.length === 1) throw new ConflictError('Este é o último aluno. Recuse a avaliação inteira.');
  diagnosticRepository.removeStudent(id, studentId);
}

/** Recusar é descartar: nada foi publicado, então não há histórico a preservar. */
export function rejectDiagnostic(teacherId: string, id: string) {
  requireInReview(teacherId, id);
  diagnosticRepository.remove(id);
}

function requirePublishable({ perStudent }: Diagnostic) {
  if (!perStudent.length) throw new ConflictError('Nenhum aluno foi selecionado para esta avaliação.');
  if (perStudent.some((p) => !p.approved)) throw new ConflictError('Aprove a avaliação de todos os alunos antes de publicar.');
}

export function publishDiagnostic(teacherId: string, id: string) {
  requirePublishable(requireInReview(teacherId, id));
  transaction(() => {
    diagnosticRepository.markPublished(id);
    diagnosticRepository.setStage(id, 'respostas');
    diagnosticRepository.updateStep(id, 'respostas', { status: 'executando', result: 'Aguardando as respostas' });
  });
}
