import * as catalogRepository from '../../repositories/catalog.repository';
import type { NeedId } from '../../types/domain';
import { ConflictError } from '../shared/errors';

export const listPeriods = () => catalogRepository.listPeriods();
export const listSubjects = () => catalogRepository.listSubjects();
export const listSubtopics = (subjectId: string) => catalogRepository.listSubtopics(subjectId);
export const listNeeds = () => catalogRepository.listNeeds();

/** O período atual é o último cadastrado; `previous` é a base de comparação do perfil. */
export function periodWindow() {
  const periods = catalogRepository.listPeriods();
  const current = periods.at(-1);
  if (!current) throw new ConflictError('Nenhum período letivo cadastrado.');
  return { current, previous: periods.at(-2) ?? null };
}

export function needLabeler() {
  const labels = new Map(catalogRepository.listNeeds().map((n) => [n.id, n.label]));
  return (id: NeedId) => labels.get(id) ?? id;
}
