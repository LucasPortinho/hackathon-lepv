import { Router } from 'express';
import * as catalog from '../controllers/catalog.controller';
import { bank } from '../controllers/exam.controller';

export const catalogRouter = Router();
catalogRouter.get('/subjects', catalog.subjects);
catalogRouter.get('/subjects/:subjectId/subtopics', catalog.subtopics);
catalogRouter.get('/periods', catalog.periods);
catalogRouter.get('/needs', catalog.needs);
catalogRouter.get('/questions/bank', bank);
