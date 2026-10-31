import express, { Router } from 'express';
import * as exams from '../controllers/exam.controller';
import * as adaptations from '../controllers/adaptation.controller';

export const examRouter = Router();
examRouter.get('/', exams.list);
examRouter.post('/', exams.create);
examRouter.get('/:id', exams.detail);
examRouter.put('/:id/questions/:questionId/key', exams.setKey);
examRouter.put('/:id/solution', express.raw({ type: () => true, limit: '25mb' }), exams.uploadSolution);
examRouter.get('/:id/corrections', exams.listCorrections);
examRouter.get('/:id/sheets/:sheetId/image', exams.sheetImage);
examRouter.get('/:id/need-counts', adaptations.needs);
examRouter.get('/:id/adaptations', adaptations.list);
examRouter.post('/:id/adapt', adaptations.generate);
examRouter.patch('/:id/group', exams.move);
examRouter.post('/:id/adaptations/finish', adaptations.finish);
