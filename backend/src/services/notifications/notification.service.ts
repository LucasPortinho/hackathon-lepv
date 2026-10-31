import { newId } from '../../lib/ids';
import { nowIso } from '../../lib/time';
import * as notificationRepository from '../../repositories/notification.repository';
import { NotFoundError } from '../shared/errors';

export const listNotifications = (teacherId: string) => notificationRepository.listByTeacher(teacherId);

export const notify = (teacherId: string, notification: { title: string; body: string; to: string }) =>
  notificationRepository.insert({ ...notification, teacherId, id: newId('n'), at: nowIso(), read: false });

export function markAllRead(teacherId: string) {
  notificationRepository.markAllRead(teacherId);
}

export function markRead(teacherId: string, id: string) {
  if (!notificationRepository.markRead(teacherId, id)) throw new NotFoundError('Notificação não encontrada.');
}
