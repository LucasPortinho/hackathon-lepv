import { Router } from 'express';
import * as classes from '../controllers/class.controller';

export const classRouter = Router();
classRouter.get('/', classes.list);
classRouter.get('/:classId', classes.detail);
classRouter.get('/:classId/students', classes.students);
classRouter.get('/:classId/exams', classes.listExams);
classRouter.get('/:classId/groups', classes.listGroups);
classRouter.post('/:classId/groups', classes.createGroup);
