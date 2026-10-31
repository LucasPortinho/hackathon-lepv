import { knownValues, mean, scoreLookup } from '../../lib/score';
import * as scoreRepository from '../../repositories/score.repository';
import * as studentRepository from '../../repositories/student.repository';

/** Alunos e notas de uma turma, carregados uma vez para os cálculos de uma operação. */
export function loadClassScores(classId: string) {
  const students = studentRepository.listByClass(classId);
  const scoreOf = scoreLookup(scoreRepository.listByClass(classId));
  const average = (subtopicId: string, periodId: string) =>
    mean(knownValues(students.map((s) => scoreOf(s.id, subtopicId, periodId))));
  return { students, scoreOf, average };
}

export type ClassScores = ReturnType<typeof loadClassScores>;
