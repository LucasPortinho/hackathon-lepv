import { z } from 'zod';
import { controller } from '../http/controller';
import { empty, fileContent, fileNameQuery, id, idParams, moveExamBody, newExamBody, noQuery, questionKeyBody, questionKeyParams, read, request } from '../http/schemas';
import * as answerKeys from '../services/exams/answer-key.service';
import * as exams from '../services/exams/exam.service';

export const list = controller(read(empty, z.object({ classId: id.optional(), groupId: id.optional() }).strict()), ({ query }, teacherId) => {
  const rows = query.classId ? exams.listClassExams(teacherId, query.classId) : exams.listExams(teacherId);
  return rows.filter((exam) => query.groupId === undefined || exam.groupId === query.groupId);
});
export const bank = controller(read(empty, noQuery), () => exams.listBank());
export const detail = controller(read(idParams, noQuery), ({ params }, teacherId) => exams.getExam(teacherId, params.id));
export const create = controller(request(empty, noQuery, newExamBody), ({ body }, teacherId) => exams.createExam(teacherId, body), 201);
export const move = controller(request(idParams, noQuery, moveExamBody), ({ params, body }, teacherId) =>
  exams.moveExam(teacherId, params.id, body.groupId), 204);
export const setKey = controller(request(questionKeyParams, noQuery, questionKeyBody), ({ params, body }, teacherId) =>
  answerKeys.setQuestionKey(teacherId, params.id, params.questionId, body), 204);
export const uploadSolution = controller(request(idParams, fileNameQuery, fileContent), ({ params, query, body }, teacherId) =>
  answerKeys.uploadSolution(teacherId, params.id, query.name, body));
