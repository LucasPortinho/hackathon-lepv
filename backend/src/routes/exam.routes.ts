import { Router } from 'express';
import * as exams from '../controllers/exam.controller';
import * as adaptations from '../controllers/adaptation.controller';

export const examRouter = Router();
examRouter.get('/', exams.list);
examRouter.post('/', exams.create);
examRouter.get('/:id', exams.detail);
examRouter.get('/:id/need-counts', adaptations.needs);
examRouter.get('/:id/adaptations', adaptations.list);
examRouter.post('/:id/adapt', adaptations.generate);
examRouter.patch('/:id/group', exams.move);
examRouter.post('/:id/adaptations/finish', adaptations.finish);
