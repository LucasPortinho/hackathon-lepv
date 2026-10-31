import { Router } from 'express';
import * as activity from '../controllers/activity.controller';
import { find } from '../controllers/search.controller';

export const activityRouter = Router();
activityRouter.get('/notifications', activity.listNotifications);
activityRouter.patch('/notifications/read', activity.markAllRead);
activityRouter.patch('/notifications/:id/read', activity.markRead);
activityRouter.get('/agent-runs', activity.listRuns);
activityRouter.get('/search', find);
