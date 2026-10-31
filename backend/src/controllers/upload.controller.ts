import { controller } from '../http/controller';
import { batchBody, empty, idParams, noQuery, read, request, sheetsBody } from '../http/schemas';
import * as uploads from '../services/uploads/upload.service';

export const createBatch = controller(request(empty, noQuery, batchBody), ({ body }, teacherId) =>
  uploads.createBatch(teacherId, body.examId, body.files), 201);
export const recordSheets = controller(request(idParams, noQuery, sheetsBody), ({ params, body }, teacherId) => {
  uploads.recordSheets(teacherId, params.id, body.sheets);
}, 204);
export const process = controller(read(idParams, noQuery), ({ params }, teacherId) => uploads.processBatch(teacherId, params.id));
