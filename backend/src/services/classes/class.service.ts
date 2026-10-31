import { transaction } from '../../db';
import { unique } from '../../lib/collections';
import { newId } from '../../lib/ids';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as classRepository from '../../repositories/class.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as uploadRepository from '../../repositories/upload.repository';
import type { ClassInput } from '../../types/inputs';
import { ConflictError, ValidationError } from '../shared/errors';
import { requireClass } from '../shared/guards';

export const listClasses = (teacherId: string) => classRepository.listByTeacher(teacherId);

function requireSubjects(subjectIds: string[]) {
  if (!subjectIds.length) throw new ValidationError('Escolha ao menos uma disciplina.');
  if (subjectIds.some((id) => !catalogRepository.findSubjectById(id))) throw new ValidationError('Disciplina desconhecida.');
}

export function createClass(teacherId: string, { subjectIds, ...fields }: ClassInput) {
  const subjects = unique(subjectIds);
  requireSubjects(subjects);
  const id = newId('c');
  transaction(() => classRepository.insert(teacherId, id, fields, subjects));
  return requireClass(teacherId, id);
}

function requireKeepsUsedSubjects(classId: string, subjectIds: string[]) {
  const missing = [...classRepository.listUsedSubjects(classId)].filter((id) => !subjectIds.includes(id));
  if (missing.length) throw new ConflictError('Esta disciplina tem provas ou avaliações na turma e não pode ser removida.');
}

export function updateClass(teacherId: string, classId: string, { subjectIds, ...fields }: ClassInput) {
  requireClass(teacherId, classId);
  const subjects = unique(subjectIds);
  requireSubjects(subjects);
  requireKeepsUsedSubjects(classId, subjects);
  transaction(() => {
    classRepository.update(classId, fields);
    classRepository.replaceSubjects(classId, subjects);
  });
  return requireClass(teacherId, classId);
}

/** Definitivo. A ordem respeita as chaves RESTRICT: folhas, avaliações, provas, alunos e, por fim, a turma. */
export function deleteClass(teacherId: string, classId: string) {
  requireClass(teacherId, classId);
  transaction(() => {
    uploadRepository.removeByClass(classId);
    diagnosticRepository.removeByClass(classId);
    examRepository.removeByClass(classId);
    studentRepository.listByClass(classId).forEach((student) => studentRepository.remove(student.id));
    classRepository.remove(classId);
  });
}
