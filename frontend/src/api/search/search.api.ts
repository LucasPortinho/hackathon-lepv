import type { SearchResult } from '@/types/domain';
import { send, withQuery } from '../client/http';

export const search = (q: string) => send<SearchResult[]>('GET', withQuery('/search', { q }));
