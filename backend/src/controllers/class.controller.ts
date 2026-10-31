import { z } from 'zod';
import { controller } from '../http/controller';
import { classBody, classParams, empty, groupBody, id, noQuery, read, request, year } from '../http/schemas';
import * as classes from '../services/classes/class.service';
import * as exams from '../services/exams/exam.service';
import * as profiles from '../services/profiles/profile.service';
import { NotFoundError } from '../services/shared/errors';
import { requireClass } from '../services/shared/guards';

export const list = controller(read(empty, z.object({ year: year.optional() }).strict()), ({ query }, teacherId) =>
  classes.listClasses(teacherId).filter((cls) => query.year === undefined || cls.year === query.year));
export const detail = controller(read(classParams, noQuery), ({ params }, teacherId) => requireClass(teacherId, params.classId));
export const students = controller(read(classParams, z.object({ subjectId: id.optional() }).strict()), ({ params, query }, teacherId) => {
  const cls = requireClass(teacherId, params.classId);
  if (query.subjectId && !cls.subjectIds.includes(query.subjectId)) throw new NotFoundError('Disciplina não encontrada na turma.');
  const subjectId = query.subjectId ?? cls.subjectIds[0] ?? '';
  return profiles.listStudents(teacherId, subjectId).filter((row) => row.student.classId === cls.id).map((row) => row.student);
});
export const listGroups = controller(read(classParams, noQuery), ({ params }, teacherId) => exams.listGroups(teacherId, params.classId));
export const createGroup = controller(request(classParams, noQuery, groupBody), ({ params, body }, teacherId) =>
  exams.createGroup(teacherId, params.classId, body.name), 201);
export const listExams = controller(read(classParams, noQuery), ({ params }, teacherId) => exams.listClassExams(teacherId, params.classId));
export const create = controller(request(empty, noQuery, classBody), ({ body }, teacherId) => classes.createClass(teacherId, body), 201);
export const update = controller(request(classParams, noQuery, classBody), ({ params, body }, teacherId) => classes.updateClass(teacherId, params.classId, body));
export const remove = controller(read(classParams, noQuery), ({ params }, teacherId) => classes.deleteClass(teacherId, params.classId), 204);
