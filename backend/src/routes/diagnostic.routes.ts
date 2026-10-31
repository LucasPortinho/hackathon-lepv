import { Router } from 'express';
import * as diagnostics from '../controllers/diagnostic.controller';

export const diagnosticRouter = Router();
diagnosticRouter.get('/', diagnostics.list);
diagnosticRouter.post('/', diagnostics.create);
diagnosticRouter.get('/suggestions', diagnostics.suggestions);
diagnosticRouter.get('/:id', diagnostics.detail);
diagnosticRouter.post('/:id/run-agent', diagnostics.runAgent);
