import { controller } from '../http/controller';
import { empty, profileReviewBody, read, request, studentParams, subjectQuery } from '../http/schemas';
import * as review from '../services/profiles/profile-review.service';
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
export const reviewProfile = controller(request(studentParams, subjectQuery, profileReviewBody), ({ params, query, body }, teacherId) => {
  const { studentId } = params;
  const { subjectId } = query;
  if (body.reviewStatus === 'aprovado') review.approveProfile(teacherId, studentId, subjectId);
  else if (body.reviewStatus === 'rascunho') review.reopenProfile(teacherId, studentId, subjectId);
  else review.saveProfileEdit(teacherId, studentId, subjectId, body.summary, body.gapNotes);
}, 204);
