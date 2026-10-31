import { controller } from '../http/controller';
import { empty, noQuery, preferencesBody, read, request } from '../http/schemas';
import * as teachers from '../services/teachers/teacher.service';

export const me = controller(read(empty, noQuery), (_input, teacherId) => ({
  ...teachers.getTeacher(teacherId), preferences: teachers.getPreferences(teacherId),
}));
export const updatePreferences = controller(request(empty, noQuery, preferencesBody), ({ body }, teacherId) =>
  teachers.updatePreferences(teacherId, body));
