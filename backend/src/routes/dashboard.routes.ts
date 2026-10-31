import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';

export const dashboardRouter = Router();
dashboardRouter.get('/heatmap', dashboard.heatmap);
dashboardRouter.get('/subtopics/:subtopicId/insight', dashboard.insight);
