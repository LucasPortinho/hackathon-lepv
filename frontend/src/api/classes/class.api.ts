import type { Class } from '@/types/domain';
import { get } from '../client/http';

export const listClasses = () => get<Class[]>('/classes', { empty: [] });
