import { ClipboardList } from 'lucide-react';
import { Async, ButtonLink, Skeleton } from '@/components/ui';
import { plural } from '@/lib/format';
import { BANDS, scoreColor } from '@/lib/score';
import { useQuery } from '@/lib/useQuery';
import { getSubtopicInsight } from '@/api/dashboard/dashboard.api';
import type { DashboardQuery } from '@/types/inputs';
import '@/components/charts/charts.css';

export function SubtopicInsightPanel({ query, subtopicId, onOpenStudent }: { query: DashboardQuery; subtopicId: string; onOpenStudent: (id: string) => void }) {
  const q = useQuery(() => getSubtopicInsight(query, subtopicId), [query.classId, query.subjectId, query.periodId, subtopicId]);
  return (
    <Async
      query={q}
      skeleton={<div style={{ display: 'grid', gap: 12 }}><Skeleton w="70%" h="1.6rem" /><Skeleton w="30%" h="3rem" /><Skeleton h="11rem" /><Skeleton h="8rem" /></div>}
    >
      {(d) => {
        const peak = Math.max(...d.counts, 1);
        return (
          <div className="insight">
            <p className="insight-code">{d.subtopic.id} · {d.subtopic.unit}</p>
            <h2>{d.subtopic.name}</h2>
            {d.subtopic.description && <p className="muted insight-description">{d.subtopic.description}</p>}
            <p className="insight-stat">{d.average}</p>
            <p className="muted">Média da turma{d.noData > 0 ? `, com ${plural(d.noData, 'aluno', 'alunos')} sem dados` : ''}</p>
            <section>
              <h3>Distribuição</h3>
              <div className="hist">
                {BANDS.map((b, i) => (
                  <div className="hist-row" key={b.min}>
                    <span>{b.label}</span>
                    <div><div className="hist-bar" style={{ width: `${(d.counts[i] / peak) * 100}%`, background: scoreColor(b.mid) }} /></div>
                    <b>{d.counts[i]}</b>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3>Quem pode precisar de apoio ({d.struggling.length})</h3>
              {d.struggling.length === 0 ? <p className="muted">Todos estão com 60 ou mais nesta habilidade.</p> : (
                <ul>
                  {d.struggling.map((s) => (
                    <li key={s.student.id}><button onClick={() => onOpenStudent(s.student.id)}><span className="truncate">{s.student.name}</span><b>{s.value}</b></button></li>
                  ))}
                </ul>
              )}
            </section>
            {d.struggling.length > 0 && (
              <section><ButtonLink variant="secondary" to={`/diagnosticas?nova=1&subtopico=${d.subtopic.id}`}><ClipboardList />Criar avaliação diagnóstica</ButtonLink></section>
            )}
          </div>
        );
      }}
    </Async>
  );
}
