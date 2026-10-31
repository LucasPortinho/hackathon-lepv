import { z } from 'zod';
import { controller } from '../http/controller';
import { dashboardQuery, empty, id, read } from '../http/schemas';
import * as dashboard from '../services/dashboard/dashboard.service';

export const heatmap = controller(read(empty, dashboardQuery), ({ query }, teacherId) => dashboard.getDashboard(teacherId, query));
export const insight = controller(read(z.object({ subtopicId: id }), dashboardQuery), ({ params, query }, teacherId) =>
  dashboard.getSubtopicInsight(teacherId, query, params.subtopicId));
