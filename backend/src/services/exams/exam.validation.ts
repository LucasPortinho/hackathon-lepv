import { unique } from '../../lib/collections';
import { isCalendarDate } from '../../lib/time';
import * as catalogRepository from '../../repositories/catalog.repository';
import * as examRepository from '../../repositories/exam.repository';
import * as questionRepository from '../../repositories/question.repository';
import type { Class } from '../../types/domain';
import type { ManualQuestion, NewExam } from '../../types/inputs';
import { ValidationError } from '../shared/errors';
import { validateQuestionMetadata } from '../questions/question.validation';

export function requireGroupOfClass(groupId: string, classId: string) {
  if (examRepository.findGroup(groupId)?.classId !== classId) throw new ValidationError('A pasta não pertence à turma da prova.');
}

function validateManualQuestion(q: ManualQuestion) {
  validateQuestionMetadata(q);
  if (!q.statement.trim()) throw new ValidationError('Informe o enunciado da questão.');
  if (!(q.points > 0)) throw new ValidationError('A pontuação da questão deve ser maior que zero.');
}

function loadExistingSubtopics(ids: string[]) {
  if (unique(ids).length !== ids.length) throw new ValidationError('A prova tem questões repetidas.');
  const subtopics = new Map(questionRepository.findByIds(ids).map((q) => [q.id, q.subtopicId]));
  if (subtopics.size !== ids.length) throw new ValidationError('A prova usa uma questão inexistente.');
  return subtopics;
}

function validateQuestions({ questions, subjectId }: NewExam) {
  if (!questions.length) throw new ValidationError('A prova precisa de ao menos uma questão.');
  const existing = loadExistingSubtopics(questions.flatMap((q) => ('id' in q ? [q.id] : [])));
  const subjectTopics = new Set(catalogRepository.listSubtopics(subjectId).map((t) => t.id));
  for (const q of questions) {
    if (!subjectTopics.has('id' in q ? existing.get(q.id)! : q.subtopicId)) throw new ValidationError('A questão não pertence à disciplina da prova.');
    if (!('id' in q)) validateManualQuestion(q);
  }
}

export function validateNewExam(input: NewExam, cls: Class) {
  if (!input.title.trim()) throw new ValidationError('Informe o título da prova.');
  if (!isCalendarDate(input.date)) throw new ValidationError('Informe a data no formato AAAA-MM-DD.');
  if (!cls.subjectIds.includes(input.subjectId)) throw new ValidationError('A turma não tem esta disciplina.');
  if (input.groupId !== null) requireGroupOfClass(input.groupId, input.classId);
  validateQuestions(input);
}
