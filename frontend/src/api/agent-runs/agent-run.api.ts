import type { AgentRun } from '@/types/domain';
import { get } from '../client/http';

export const listRuns = () => get<AgentRun[]>('/agent-runs', { empty: [] });
