import { Router } from 'express';
import * as students from '../controllers/student.controller';

export const studentRouter = Router();
studentRouter.get('/', students.list);
studentRouter.get('/:studentId', students.detail);
studentRouter.get('/:studentId/profile', students.profile);
studentRouter.patch('/:studentId/profile/review', students.reviewProfile);
