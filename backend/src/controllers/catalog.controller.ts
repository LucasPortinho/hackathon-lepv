import { z } from 'zod';
import { controller } from '../http/controller';
import { empty, id, noQuery, read } from '../http/schemas';
import * as catalog from '../services/catalog/catalog.service';
import { requireSubject } from '../services/shared/guards';

export const subjects = controller(read(empty, noQuery), () => catalog.listSubjects());
export const periods = controller(read(empty, noQuery), () => catalog.listPeriods());
export const needs = controller(read(empty, noQuery), () => catalog.listNeeds());
export const subtopics = controller(read(z.object({ subjectId: id }), noQuery), ({ params }) => {
  requireSubject(params.subjectId);
  return catalog.listSubtopics(params.subjectId);
});
