import { transaction } from '../../db';
import { newId } from '../../lib/ids';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import type { Exam, ExamGroup, ExamQuestion, KeySource, Question } from '../../types/domain';
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

const originalSource = (q: Question): KeySource | undefined => {
  if (!q.answerKey && !q.solution) return undefined;
  return q.source === 'manual' ? 'professor' : 'banco';
};

/** Questões na ordem da prova, com o gabarito que vale para ela. */
export function orderedQuestions(exam: Exam): ExamQuestion[] {
  const questions = new Map(questionRepository.findByIds(exam.questionIds).map((q) => [q.id, q]));
  const keys = new Map(examRepository.listQuestionKeys(exam.id).map((k) => [k.questionId, k]));
  return exam.questionIds.map((id) => {
    const question = questions.get(id)!;
    const key = keys.get(id);
    return {
      ...question,
      answerKey: key?.answerKey ?? question.answerKey,
      solution: key?.solution ?? question.solution,
      keySource: key?.keySource ?? originalSource(question),
    };
  });
}

export function getExam(teacherId: string, examId: string) {
  const exam = requireExam(teacherId, examId);
  return { exam, questions: orderedQuestions(exam) };
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
