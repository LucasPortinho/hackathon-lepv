import type { DashboardData, SubtopicInsight } from '@/types/domain';
import type { DashboardQuery } from '@/types/inputs';
import { get, withQuery } from '../client/http';

const EMPTY: DashboardData = { subtopics: [], rows: [], kpis: { average: null, attention: 0, examsProcessed: 0, adaptations: 0 }, pendingReviews: 0 };

export const getDashboard = (q: DashboardQuery) => get<DashboardData>(withQuery('/dashboard/heatmap', { ...q }), { empty: EMPTY });

export const getSubtopicInsight = (q: DashboardQuery, subtopicId: string) =>
  get<SubtopicInsight>(withQuery(`/dashboard/subtopics/${subtopicId}/insight`, { ...q }));
