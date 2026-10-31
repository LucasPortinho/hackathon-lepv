import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { agentRuns } from '../db/schema';
import type { AgentRun } from '../types/domain';

export interface NewRun extends Omit<AgentRun, 'link'> {
  teacherId: string;
  link: { label: string; to: string };
  examId?: string;
  diagnosticId?: string;
  uploadBatchId?: string;
}

const toRun = (r: typeof agentRuns.$inferSelect): AgentRun => ({
  id: r.id,
  agent: r.agent,
  summary: r.summary,
  detail: r.detail ?? undefined,
  status: r.status,
  at: r.at,
  link: r.linkLabel && r.linkTo ? { label: r.linkLabel, to: r.linkTo } : undefined,
});

export const listByTeacher = (teacherId: string) =>
  db.select().from(agentRuns).where(eq(agentRuns.teacherId, teacherId)).orderBy(desc(agentRuns.at)).all().map(toRun);

export const insert = ({ link, ...run }: NewRun) =>
  db.insert(agentRuns).values({ ...run, linkLabel: link.label, linkTo: link.to }).run();
