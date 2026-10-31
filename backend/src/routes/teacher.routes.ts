import { Router } from 'express';
import * as teachers from '../controllers/teacher.controller';

export const teacherRouter = Router();
teacherRouter.get('/me', teachers.me);
