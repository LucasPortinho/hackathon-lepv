import { controller } from '../http/controller';
import { empty, read, studentParams, subjectQuery } from '../http/schemas';
import * as profiles from '../services/profiles/profile.service';
import { requireSubject } from '../services/shared/guards';

export const list = controller(read(empty, subjectQuery), ({ query }, teacherId) => {
  requireSubject(query.subjectId);
  return profiles.listStudents(teacherId, query.subjectId);
});
export const detail = controller(read(studentParams, subjectQuery), ({ params, query }, teacherId) =>
  profiles.getStudentDetail(teacherId, params.studentId, query.subjectId));
export const profile = controller(read(studentParams, subjectQuery), ({ params, query }, teacherId) =>
  profiles.getStudentDetail(teacherId, params.studentId, query.subjectId).profile);
