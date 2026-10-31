import { questionCheckResults, questionDifficulties } from '../../db/schema';
import type { QuestionMetadata } from '../../types/domain';
import { ValidationError } from '../shared/errors';

/** Também protege chamadas diretas dos agentes, que não passam pelo controller. */
export function validateQuestionMetadata(question: QuestionMetadata) {
  if (question.alternatives !== undefined && (!Array.isArray(question.alternatives)
    || question.alternatives.length > 20 || question.alternatives.some((value) => typeof value !== 'string' || !value.trim() || value.length > 20000))) {
    throw new ValidationError('As alternativas devem ser uma lista de até 20 textos não vazios.');
  }
  for (const value of [question.answerKey, question.solution]) {
    if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 20000)) {
      throw new ValidationError('Gabarito e resolução devem conter texto não vazio.');
    }
  }
  if (question.difficulty !== undefined && !questionDifficulties.includes(question.difficulty)) throw new ValidationError('Dificuldade desconhecida.');
  if (question.checkResult !== undefined && !questionCheckResults.includes(question.checkResult)) throw new ValidationError('Resultado de checagem desconhecido.');
}
