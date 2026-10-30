import { Badge } from '@/components/ui';
import type { ExamStatus } from '@/types/domain';

const MAP: Record<ExamStatus, { label: string; tone?: 'accent' | 'caution' }> = {
  rascunho: { label: 'Rascunho' },
  em_adaptacao: { label: 'Aguardando revisão', tone: 'accent' },
  pronta: { label: 'Versões prontas', tone: 'accent' },
  corrigida: { label: 'Corrigida' },
};

export const StatusBadge = ({ status }: { status: ExamStatus }) => <Badge tone={MAP[status].tone}>{MAP[status].label}</Badge>;
export const STATUS_LABEL = MAP;
