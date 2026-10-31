import { Router } from 'express';
import * as diagnostics from '../controllers/diagnostic.controller';

export const diagnosticRouter = Router();
diagnosticRouter.get('/', diagnostics.list);
diagnosticRouter.post('/', diagnostics.create);
diagnosticRouter.get('/suggestions', diagnostics.suggestions);
diagnosticRouter.get('/:id', diagnostics.detail);
diagnosticRouter.get('/:id/creator-context', diagnostics.creatorContext);
diagnosticRouter.post('/:id/students/:studentId/items', diagnostics.creatorItems);
diagnosticRouter.post('/:id/run-agent', diagnostics.runAgent);
diagnosticRouter.post('/:id/approve-all', diagnostics.approveAll);
diagnosticRouter.post('/:id/publish', diagnostics.publish);
diagnosticRouter.post('/:id/answers', diagnostics.answers);
diagnosticRouter.patch('/:id/students/:studentId/approve', diagnostics.approveStudent);
