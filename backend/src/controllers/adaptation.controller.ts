import { controller } from '../http/controller';
import { adaptBody, idParams, noQuery, read, request } from '../http/schemas';
import * as adaptations from '../services/adaptations/adaptation.service';

export const needs = controller(read(idParams, noQuery), ({ params }, teacherId) => adaptations.getNeedCounts(teacherId, params.id));
export const list = controller(read(idParams, noQuery), ({ params }, teacherId) => adaptations.getAdaptations(teacherId, params.id));
// O service executa sincronamente e retorna as versões; não há job assíncrono para responder 202.
export const generate = controller(request(idParams, noQuery, adaptBody), ({ params, body }, teacherId) =>
  adaptations.generateAdaptations(teacherId, params.id, body.needs));
