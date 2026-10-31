import { controller } from '../http/controller';
import { batchBody, empty, idParams, noQuery, request, sheetsBody } from '../http/schemas';
import * as uploads from '../services/uploads/upload.service';

export const createBatch = controller(request(empty, noQuery, batchBody), ({ body }, teacherId) =>
  uploads.createBatch(teacherId, body.examId, body.files), 201);
export const recordSheets = controller(request(idParams, noQuery, sheetsBody), ({ params, body }, teacherId) => {
  uploads.recordSheets(teacherId, params.id, body.sheets);
}, 204);
