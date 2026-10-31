import { z } from 'zod';
import { controller } from '../http/controller';
import { approvalBody, creatorItemsBody, empty, id, idParams, newDiagnosticBody, noQuery, read, request, runAgentBody, studentParams } from '../http/schemas';
import * as diagnostics from '../services/diagnostics/diagnostic.service';
import { advanceDiagnostic } from '../services/diagnostics/diagnostic-agent.service';
import { receiveAnswers } from '../services/diagnostics/diagnostic-results.service';
import * as review from '../services/diagnostics/diagnostic-review.service';
import { ConflictError } from '../services/shared/errors';
import * as creator from '../services/diagnostics/diagnostic-creator.service';

export const list = controller(read(empty, noQuery), (_input, teacherId) => diagnostics.listDiagnostics(teacherId));
export const suggestions = controller(read(empty, z.object({ classId: id, subjectId: id }).strict()), ({ query }, teacherId) =>
  diagnostics.suggestSubtopics(teacherId, query.classId, query.subjectId));
export const detail = controller(read(idParams, noQuery), ({ params }, teacherId) => diagnostics.getDiagnostic(teacherId, params.id));
export const creatorContext = controller(read(idParams, noQuery), ({ params }, teacherId) => creator.getCreatorContext(teacherId, params.id));
export const creatorItems = controller(request(idParams.extend(studentParams.shape), noQuery, creatorItemsBody), ({ params, body }, teacherId) =>
  creator.saveCreatorItems(teacherId, params.id, params.studentId, body.items));
export const create = controller(request(empty, noQuery, newDiagnosticBody), ({ body }, teacherId) =>
  diagnostics.createDiagnostic(teacherId, body.classId, body.subtopicIds), 201);
export const runAgent = controller(request(idParams, noQuery, runAgentBody), ({ params, body }, teacherId) => {
  if (body.stage && diagnostics.getDiagnostic(teacherId, params.id).diagnostic.stage !== body.stage) {
    throw new ConflictError('A etapa informada não corresponde à etapa atual da avaliação.');
  }
  return advanceDiagnostic(teacherId, params.id);
});
export const approveStudent = controller(request(idParams.extend(studentParams.shape), noQuery, approvalBody), ({ params, body }, teacherId) =>
  review.approveForStudent(teacherId, params.id, params.studentId, body.approved), 204);
export const approveAll = controller(read(idParams, noQuery), ({ params }, teacherId) => review.approveAll(teacherId, params.id), 204);
export const publish = controller(read(idParams, noQuery), ({ params }, teacherId) => review.publishDiagnostic(teacherId, params.id), 204);
export const answers = controller(read(idParams, noQuery), ({ params }, teacherId) => receiveAnswers(teacherId, params.id), 204);
export const reject = controller(read(idParams, noQuery), ({ params }, teacherId) => review.rejectDiagnostic(teacherId, params.id), 204);
export const rejectStudent = controller(read(idParams.extend(studentParams.shape), noQuery), ({ params }, teacherId) =>
  review.rejectForStudent(teacherId, params.id, params.studentId), 204);
