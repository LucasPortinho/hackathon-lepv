import { GraduationCap, LayoutGrid, List } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Card, EmptyState, Segmented, Skeleton } from '@/components/ui';
import { plural } from '@/lib/format';
import { variants } from '@/lib/motion';
import { useQuery } from '@/lib/useQuery';
import { listClasses } from '@/services/catalog';
import './classes.css';

export function ClassesPage() {
  useCrumbs([{ label: 'Turmas' }]);
  const q = useQuery(listClasses, []);
  const [view, setView] = useState<'grade' | 'lista'>('grade');
  return (
    <>
      <PageHeader title="Turmas" actions={<Segmented label="Modo de exibição" value={view} onChange={setView} options={[{ value: 'grade', label: 'Grade', icon: <LayoutGrid />, hideLabel: true }, { value: 'lista', label: 'Lista', icon: <List />, hideLabel: true }]} />} />
      <Async
        query={q} isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<GraduationCap />} title="Nenhuma turma por aqui">As turmas da sua escola aparecem aqui assim que forem vinculadas ao seu perfil.</EmptyState></Card>}
        skeleton={<div className="class-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h="9rem" r="var(--r-lg)" />)}</div>}
      >
        {(d) => view === 'grade' ? (
          <motion.div className="class-grid" initial="hidden" animate="shown" variants={variants.listParent}>
            {d.map((c) => (
              <motion.div key={c.id} variants={variants.listItem}>
                <Link to={`/turmas/${c.id}`} className="card card-link class-card">
                  <h2>{c.name}</h2>
                  <p className="muted">{c.level} · {c.school}</p>
                  <div className="class-meta"><span>{c.studentCount ? plural(c.studentCount, 'aluno', 'alunos') : 'Sem alunos'}</span><span>{c.year}</span></div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card pad={false}>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Turma</th><th>Escola</th><th className="right">Alunos</th></tr></thead>
              <tbody>{d.map((c) => <tr key={c.id}><td className="cell-strong"><Link to={`/turmas/${c.id}`} className="link" style={{ fontWeight: 600 }}>{c.name}</Link></td><td>{c.school}</td><td className="right">{c.studentCount}</td></tr>)}</tbody>
            </table></div>
          </Card>
        )}
      </Async>
    </>
  );
}
