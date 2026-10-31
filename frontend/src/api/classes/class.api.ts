import type { Class } from '@/types/domain';
import type { ClassInput } from '@/types/inputs';
import { reloadClasses } from '../catalog/catalog.store';
import { get, mutateCatalog } from '../client/http';

export const listClasses = () => get<Class[]>('/classes', { empty: [] });
export const createClass = (input: ClassInput) => mutateCatalog<Class>('POST', '/classes', input, reloadClasses);
export const updateClass = (id: string, input: ClassInput) => mutateCatalog<Class>('PUT', `/classes/${id}`, input, reloadClasses);
export const deleteClass = (id: string) => mutateCatalog('DELETE', `/classes/${id}`, undefined, reloadClasses);
