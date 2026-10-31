import { controller } from '../http/controller';
import { empty, noQuery, read } from '../http/schemas';
import * as teachers from '../services/teachers/teacher.service';

export const me = controller(read(empty, noQuery), (_input, teacherId) => ({
  ...teachers.getTeacher(teacherId), preferences: teachers.getPreferences(teacherId),
}));
