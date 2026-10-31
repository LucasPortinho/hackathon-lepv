import { controller } from '../http/controller';
import { batchBody, empty, fileContent, fileParams, idParams, noQuery, read, request, sheetsBody } from '../http/schemas';
import * as uploads from '../services/uploads/upload.service';

export const createBatch = controller(request(empty, noQuery, batchBody), ({ body }, teacherId) =>
  ('examId' in body ? uploads.createBatch(teacherId, body.examId, body.files) : uploads.createDiagnosticBatch(teacherId, body.diagnosticId, body.files)), 201);
export const storeFile = controller(request(fileParams, noQuery, fileContent), ({ params, body }, teacherId) =>
  uploads.storeFile(teacherId, params.id, params.fileId, body), 204);
export const recordSheets = controller(request(idParams, noQuery, sheetsBody), ({ params, body }, teacherId) => {
  uploads.recordSheets(teacherId, params.id, body.sheets);
}, 204);
export const process = controller(read(idParams, noQuery), ({ params }, teacherId) => uploads.processBatch(teacherId, params.id));
