import * as catalogRepository from '../../repositories/catalog.repository';
import * as classRepository from '../../repositories/class.repository';
import * as diagnosticRepository from '../../repositories/diagnostic.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as studentRepository from '../../repositories/student.repository';
import * as teacherRepository from '../../repositories/teacher.repository';
import { NotFoundError } from './errors';

// Todo acesso passa pelo professor dono da turma: recurso alheio responde como inexistente.
export function requireFound<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new NotFoundError(message);
  return value;
}

export const requireTeacher = (teacherId: string) =>
  requireFound(teacherRepository.findById(teacherId), 'Professor não encontrado.');

export const requireSubject = (subjectId: string) =>
  requireFound(catalogRepository.findSubjectById(subjectId), 'Disciplina não encontrada.');

export const requireClass = (teacherId: string, classId: string) =>
  requireFound(classRepository.findOwned(teacherId, classId), 'Turma não encontrada.');

export const requireStudent = (teacherId: string, studentId: string) =>
  requireFound(studentRepository.findOwned(teacherId, studentId), 'Aluno não encontrado.');

export const requireExam = (teacherId: string, examId: string) =>
  requireFound(examRepository.findOwned(teacherId, examId), 'Prova não encontrada.');

export const requireDiagnostic = (teacherId: string, diagnosticId: string) =>
  requireFound(diagnosticRepository.findOwned(teacherId, diagnosticId), 'Avaliação não encontrada.');
