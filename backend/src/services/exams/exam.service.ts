import { transaction } from '../../db';
import { newId } from '../../lib/ids';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import type { ExamGroup } from '../../types/domain';
import type { NewExam } from '../../types/inputs';
import { ValidationError } from '../shared/errors';
import { requireClass, requireExam } from '../shared/guards';
import { requireGroupOfClass, validateNewExam } from './exam.validation';

export const listExams = (teacherId: string) => examRepository.listByTeacher(teacherId);
export const listBank = () => questionRepository.listBank();

export function listClassExams(teacherId: string, classId: string) {
  requireClass(teacherId, classId);
  return examRepository.listByClass(classId);
}

export function listGroups(teacherId: string, classId: string) {
  requireClass(teacherId, classId);
  return examRepository.listGroups(classId);
}

export function getExam(teacherId: string, examId: string) {
  const exam = requireExam(teacherId, examId);
  const questions = new Map(questionRepository.findByIds(exam.questionIds).map((q) => [q.id, q]));
  return { exam, questions: exam.questionIds.map((id) => questions.get(id)!) };
}

export function moveExam(teacherId: string, examId: string, groupId: string | null) {
  const exam = requireExam(teacherId, examId);
  if (groupId !== null) requireGroupOfClass(groupId, exam.classId);
  examRepository.setGroup(examId, groupId);
}

export function createGroup(teacherId: string, classId: string, name: string): ExamGroup {
  requireClass(teacherId, classId);
  if (!name.trim()) throw new ValidationError('Informe o nome da pasta.');
  const group = { id: newId('g'), classId, name: name.trim() };
  examRepository.insertGroup(group);
  return group;
}

function resolveQuestionId(question: NewExam['questions'][number]) {
  if ('id' in question) return question.id;
  const id = newId('q');
  questionRepository.insertManual({ ...question, id });
  return id;
}

export function createExam(teacherId: string, input: NewExam) {
  validateNewExam(input, requireClass(teacherId, input.classId));
  const { title, classId, subjectId, groupId, date, questions } = input;
  const id = newId('e');
  transaction(() => examRepository.insert({ id, title: title.trim(), classId, subjectId, groupId, date }, questions.map(resolveQuestionId)));
  return requireExam(teacherId, id);
}
