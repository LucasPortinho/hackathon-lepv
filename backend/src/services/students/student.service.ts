import { transaction } from '../../db';
import { unique } from '../../lib/collections';
import { newId } from '../../lib/ids';
import * as studentRepository from '../../repositories/student.repository';
import type { StudentInput } from '../../types/inputs';
import { ConflictError } from '../shared/errors';
import { requireClass, requireStudent } from '../shared/guards';

export function createStudent(teacherId: string, { name, classId, declaredNeeds }: StudentInput) {
  requireClass(teacherId, classId);
  const id = newId('s');
  transaction(() => {
    studentRepository.insert({ id, name, classId });
    studentRepository.replaceNeeds(id, [], unique(declaredNeeds));
  });
  return requireStudent(teacherId, id);
}

export function updateStudent(teacherId: string, studentId: string, { name, classId, declaredNeeds }: StudentInput) {
  const student = requireStudent(teacherId, studentId);
  requireClass(teacherId, classId);
  if (classId !== student.classId && studentRepository.hasClassRecords(studentId)) {
    throw new ConflictError('Este aluno já tem provas ou avaliações nesta turma e não pode trocar de turma.');
  }
  transaction(() => {
    studentRepository.update(studentId, { name, classId });
    studentRepository.replaceNeeds(studentId, student.declaredNeeds, unique(declaredNeeds));
  });
  return requireStudent(teacherId, studentId);
}

/** Definitivo: apaga as notas, o perfil e as folhas do aluno. */
export function deleteStudent(teacherId: string, studentId: string) {
  requireStudent(teacherId, studentId);
  transaction(() => studentRepository.remove(studentId));
}
