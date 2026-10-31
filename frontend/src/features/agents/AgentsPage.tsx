import { BookOpenCheck, Bot, FileCheck2, PenTool, Accessibility } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Card, EmptyState, Segmented, Skeleton } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { springs, variants } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { listRuns } from '@/api/agent-runs/agent-run.api';
import type { AgentId } from '@/types/domain';
import './agents.css';

const AGENTS: Record<AgentId, { label: string; icon: React.ReactNode }> = {
  pedagogico: { label: 'Pedagógico', icon: <BookOpenCheck /> },
  adaptacao: { label: 'Adaptação', icon: <Accessibility /> },
  criador: { label: 'Criador', icon: <PenTool /> },
  correcao: { label: 'Leitura', icon: <FileCheck2 /> },
};

export function AgentsPage() {
  useCrumbs([{ label: 'Agentes IA' }]);
  const q = useQuery(listRuns, []);
  const [filter, setFilter] = useState<'todos' | AgentId>('todos');
  return (
    <>
      <PageHeader title="Agentes IA" description="O que cada agente fez, e o que ainda aguarda você." actions={<Segmented label="Filtrar por agente" value={filter} onChange={setFilter} options={[{ value: 'todos', label: 'Todos' }, ...Object.entries(AGENTS).map(([value, a]) => ({ value: value as AgentId, label: a.label }))]} />} />
      <Async
        query={q} isEmpty={(d) => d.length === 0}
        skeleton={<div style={{ display: 'grid', gap: 16, maxWidth: '46rem' }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="4rem" r="var(--r-lg)" />)}</div>}
        empty={<Card><EmptyState icon={<Bot />} title="Os agentes ainda não trabalharam">Envie provas corrigidas ou adapte uma prova, e a atividade aparece aqui.</EmptyState></Card>}
      >
        {(d) => {
          const list = d.filter((r) => filter === 'todos' || r.agent === filter);
          return list.length === 0 ? <Card><EmptyState icon={<Bot />} title="Nenhuma atividade deste agente" /></Card> : (
            <motion.ol className="timeline" key={filter} initial="hidden" animate="shown" variants={variants.listParent}>
              <AnimatePresence initial={false}>
                {list.map((r) => (
                  <motion.li key={r.id} className="run" layout="position" transition={springs.glide} variants={variants.listItem}>
                    <span className="run-icon" aria-hidden>{AGENTS[r.agent].icon}</span>
                    <div className="run-body">
                      <div className="run-top"><span>Agente {AGENTS[r.agent].label}</span><span>· {relativeTime(r.at)}</span>{r.status === 'atencao' && <Badge tone="accent">Aguarda você</Badge>}</div>
                      <h2>{r.summary}</h2>
                      {r.detail && <p>{r.detail}</p>}
                      {r.link && <Link className="link" to={r.link.to} style={{ fontSize: 'var(--text-sm)' }}>{r.link.label}</Link>}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ol>
          );
        }}
      </Async>
    </>
  );
}
