import { newId } from '../../lib/ids';
import { nowIso } from '../../lib/time';
import * as agentRunRepository from '../../repositories/agent-run.repository';
import type { NewRun } from '../../repositories/agent-run.repository';

export const listRuns = (teacherId: string) => agentRunRepository.listByTeacher(teacherId);

export const recordRun = (run: Omit<NewRun, 'id' | 'at'>) =>
  agentRunRepository.insert({ ...run, id: newId('r'), at: nowIso() });
