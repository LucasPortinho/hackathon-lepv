import { z } from 'zod';
import { controller } from '../http/controller';
import { empty, id, idParams, newDiagnosticBody, noQuery, read, request, runAgentBody } from '../http/schemas';
import * as diagnostics from '../services/diagnostics/diagnostic.service';
import { advanceDiagnostic } from '../services/diagnostics/diagnostic-agent.service';
import { ConflictError } from '../services/shared/errors';

export const list = controller(read(empty, noQuery), (_input, teacherId) => diagnostics.listDiagnostics(teacherId));
export const suggestions = controller(read(empty, z.object({ classId: id, subjectId: id }).strict()), ({ query }, teacherId) =>
  diagnostics.suggestSubtopics(teacherId, query.classId, query.subjectId));
export const detail = controller(read(idParams, noQuery), ({ params }, teacherId) => diagnostics.getDiagnostic(teacherId, params.id));
export const create = controller(request(empty, noQuery, newDiagnosticBody), ({ body }, teacherId) =>
  diagnostics.createDiagnostic(teacherId, body.classId, body.subtopicIds), 201);
export const runAgent = controller(request(idParams, noQuery, runAgentBody), ({ params, body }, teacherId) => {
  if (body.stage && diagnostics.getDiagnostic(teacherId, params.id).diagnostic.stage !== body.stage) {
    throw new ConflictError('A etapa informada não corresponde à etapa atual da avaliação.');
  }
  return advanceDiagnostic(teacherId, params.id);
});
