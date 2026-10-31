import { z } from 'zod';
import { controller } from '../http/controller';
import { empty, id, idParams, newExamBody, noQuery, read, request } from '../http/schemas';
import * as exams from '../services/exams/exam.service';

export const list = controller(read(empty, z.object({ classId: id.optional(), groupId: id.optional() }).strict()), ({ query }, teacherId) => {
  const rows = query.classId ? exams.listClassExams(teacherId, query.classId) : exams.listExams(teacherId);
  return rows.filter((exam) => query.groupId === undefined || exam.groupId === query.groupId);
});
export const bank = controller(read(empty, noQuery), () => exams.listBank());
export const detail = controller(read(idParams, noQuery), ({ params }, teacherId) => exams.getExam(teacherId, params.id));
export const create = controller(request(empty, noQuery, newExamBody), ({ body }, teacherId) => exams.createExam(teacherId, body), 201);
