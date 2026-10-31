import { z } from 'zod';
import { agentIds } from '../db/schema';
import { controller } from '../http/controller';
import { empty, idParams, noQuery, queryBoolean, read } from '../http/schemas';
import * as notifications from '../services/notifications/notification.service';
import * as runs from '../services/agent-runs/agent-run.service';

export const listNotifications = controller(read(empty, z.object({ unreadOnly: queryBoolean.optional() }).strict()), ({ query }, teacherId) =>
  notifications.listNotifications(teacherId).filter((row) => !query.unreadOnly || !row.read));
export const listRuns = controller(read(empty, z.object({ agent: z.enum(agentIds).optional() }).strict()), ({ query }, teacherId) =>
  runs.listRuns(teacherId).filter((row) => !query.agent || row.agent === query.agent));
export const markRead = controller(read(idParams, noQuery), ({ params }, teacherId) => notifications.markRead(teacherId, params.id), 204);
export const markAllRead = controller(read(empty, noQuery), (_input, teacherId) => notifications.markAllRead(teacherId), 204);
