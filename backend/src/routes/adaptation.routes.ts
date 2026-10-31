import { Router } from 'express';
import * as adaptations from '../controllers/adaptation.controller';

export const adaptationRouter = Router();
adaptationRouter.patch('/:id', adaptations.update);
