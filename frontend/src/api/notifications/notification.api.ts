import type { AppNotification } from '@/types/domain';
import { get, mutate } from '../client/http';

export const listNotifications = () => get<AppNotification[]>('/notifications');
export const markAllRead = () => mutate('PATCH', '/notifications/read');
export const markRead = (id: string) => mutate('PATCH', `/notifications/${id}/read`);
