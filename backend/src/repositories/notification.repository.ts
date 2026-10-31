import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { notifications } from '../db/schema';
import type { AppNotification } from '../types/domain';

const toNotification = ({ teacherId: _, to, ...n }: typeof notifications.$inferSelect): AppNotification => ({ ...n, to: to ?? undefined });

export const listByTeacher = (teacherId: string) =>
  db.select().from(notifications).where(eq(notifications.teacherId, teacherId)).orderBy(desc(notifications.at)).all().map(toNotification);

export const insert = (notification: AppNotification & { teacherId: string }) =>
  db.insert(notifications).values(notification).run();

export const markAllRead = (teacherId: string) =>
  db.update(notifications).set({ read: true }).where(eq(notifications.teacherId, teacherId)).run();

export const markRead = (teacherId: string, id: string) =>
  db.update(notifications).set({ read: true }).where(and(eq(notifications.teacherId, teacherId), eq(notifications.id, id))).run().changes;
